<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;
use LdapRecord\Connection;
use LdapRecord\Auth\BindException;
use Throwable;

/**
 * Gère l'authentification LDAP + la rotation des tokens Sanctum / refresh.
 *
 * Flux login :
 *   1. Bind LDAP avec les credentials de l'agent.
 *   2. Synchronisation du User Eloquent (uid, name, email, groups).
 *   3. Access token Sanctum (1h, retourné en JSON) + refresh token (30j, cookie httpOnly).
 *
 * Flux refresh :
 *   Le cookie httpOnly est envoyé automatiquement sur POST /api/auth/refresh.
 *   Le refresh token est tourné à chaque appel (rotation systématique côté Redis).
 */
class AuthController extends Controller
{
    private const TOKEN_NAME      = 'pain-api-token';
    private const REFRESH_TTL_SEC = 60 * 60 * 24 * 30; // 30 jours
    private const REFRESH_TTL_MIN = self::REFRESH_TTL_SEC / 60;
    private const COOKIE_NAME     = 'refresh_token';
    // Path restreint : le cookie n'est envoyé par le navigateur qu'à cet endpoint.
    private const COOKIE_PATH     = '/api/auth/refresh';

    /** POST /api/auth/login */
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'identifiant'  => ['required', 'string'],
            'mot_de_passe' => ['required', 'string'],
        ]);

        $uid      = trim($credentials['identifiant']);
        $password = $credentials['mot_de_passe'];

        try {
            $ldapUser = $this->authenticateWithLdap($uid, $password);
        } catch (BindException $e) {
            Log::warning('Échec authentification LDAP', ['uid' => $uid, 'error' => $e->getMessage()]);
            Log::channel('activity')->warning('login_failure', [
                'uid' => $uid,
                'ip'  => $request->ip(),
            ]);
            return response()->json(['error' => 'Identifiant ou mot de passe incorrect.'], 401);
        } catch (Throwable $e) {
            Log::error('Erreur LDAP', ['uid' => $uid, 'error' => $e->getMessage()]);
            Log::channel('activity')->error('login_error', [
                'uid' => $uid,
                'ip'  => $request->ip(),
            ]);
            return response()->json(['error' => 'Service d\'authentification indisponible.'], 503);
        }

        $user = User::updateOrCreate(
            ['uid' => $uid],
            [
                'name'   => $ldapUser['name']   ?? $uid,
                'email'  => $ldapUser['email']  ?? null,
                'groups' => $ldapUser['groups'] ?? [],
            ]
        );

        $user->tokens()->delete();

        [$accessToken, $refreshToken] = $this->issueTokens($user);

        Log::channel('activity')->info('login_success', [
            'uid'  => $user->uid,
            'name' => $user->name,
            'ip'   => $request->ip(),
        ]);

        return response()
            ->json([
                'token' => $accessToken,
                'user'  => $this->userPayload($user),
            ])
            ->cookie(
                self::COOKIE_NAME,
                $refreshToken,
                self::REFRESH_TTL_MIN,
                self::COOKIE_PATH,
                null,
                (bool) env('COOKIE_SECURE', false),
                true,    // httpOnly
                false,   // raw
                'Strict'
            );
    }

    /** POST /api/auth/refresh — public, authentifié via cookie httpOnly uniquement */
    public function refresh(Request $request): JsonResponse
    {
        $refreshToken = $request->cookie(self::COOKIE_NAME);

        if (!$refreshToken) {
            return response()->json(['error' => 'Refresh token manquant.'], 401);
        }

        $hash   = hash('sha256', $refreshToken);
        $userId = Redis::get("refresh:{$hash}");

        if (!$userId) {
            return response()
                ->json(['error' => 'Session expirée, veuillez vous reconnecter.'], 401)
                ->withoutCookie(self::COOKIE_NAME, self::COOKIE_PATH);
        }

        $user = User::find($userId);

        if (!$user) {
            Redis::del("refresh:{$hash}");
            return response()
                ->json(['error' => 'Utilisateur introuvable.'], 401)
                ->withoutCookie(self::COOKIE_NAME, self::COOKIE_PATH);
        }

        // Rotation : invalide l'ancien refresh + tous les access tokens avant d'en émettre de nouveaux.
        Redis::del("refresh:{$hash}");
        $user->tokens()->delete();

        [$accessToken, $newRefreshToken] = $this->issueTokens($user);

        return response()
            ->json([
                'token' => $accessToken,
                'user'  => $this->userPayload($user),
            ])
            ->cookie(
                self::COOKIE_NAME,
                $newRefreshToken,
                self::REFRESH_TTL_MIN,
                self::COOKIE_PATH,
                null,
                (bool) env('COOKIE_SECURE', false),
                true,
                false,
                'Strict'
            );
    }

    /** POST /api/auth/logout */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        Log::channel('activity')->info('logout', [
            'uid'  => $user->uid,
            'name' => $user->name,
            'ip'   => $request->ip(),
        ]);

        $user->currentAccessToken()->delete();

        $refreshToken = $request->cookie(self::COOKIE_NAME);
        if ($refreshToken) {
            Redis::del('refresh:' . hash('sha256', $refreshToken));
        }

        return response()
            ->json(['message' => 'Déconnexion réussie.'])
            ->withoutCookie(self::COOKIE_NAME, self::COOKIE_PATH);
    }

    /** GET /api/auth/me */
    public function me(Request $request): JsonResponse
    {
        return response()->json($this->userPayload($request->user()));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Émet un access token Sanctum (1h) + un refresh token stocké dans Redis (30j). */
    private function issueTokens(User $user): array
    {
        $accessToken = $user
            ->createToken(self::TOKEN_NAME, ['*'], now()->addHour())
            ->plainTextToken;

        $refreshToken     = Str::random(64);
        $refreshTokenHash = hash('sha256', $refreshToken);

        Redis::setex("refresh:{$refreshTokenHash}", self::REFRESH_TTL_SEC, $user->id);

        return [$accessToken, $refreshToken];
    }

    private function userPayload(User $user): array
    {
        return [
            'uid'    => $user->uid,
            'name'   => $user->name,
            'email'  => $user->email,
            'groups' => $user->groups ?? [],
        ];
    }

    /**
     * Tente un bind LDAP avec les credentials fournis et retourne les attributs
     * de l'utilisateur (name, email, groups).
     *
     * @throws BindException Si les credentials sont invalides.
     * @throws \Throwable    Si la connexion LDAP échoue.
     */
    private function authenticateWithLdap(string $uid, string $password): array
    {
        $connection = new Connection([
            'hosts'    => [config('ldap.connections.default.hosts.0')],
            'port'     => config('ldap.connections.default.port'),
            'base_dn'  => config('ldap.connections.default.base_dn'),
            'username' => config('ldap.connections.default.username'),
            'password' => config('ldap.connections.default.password'),
            'use_ssl'  => config('ldap.connections.default.use_ssl'),
            'use_tls'  => config('ldap.connections.default.use_tls'),
        ]);

        $connection->connect();

        $results = $connection->query()
            ->where('uid', '=', $uid)
            ->select(['dn', 'cn', 'mail', 'memberOf', 'givenName', 'sn'])
            ->first();

        if (!$results) {
            throw new BindException("Utilisateur '$uid' introuvable dans l'annuaire.");
        }

        $userDn = $results['dn'];

        // Re-bind avec les credentials de l'utilisateur pour vérifier le mot de passe
        $connection->auth()->bind($userDn, $password);

        $groups   = [];
        $memberOf = $results['memberof'] ?? [];
        if (is_string($memberOf)) {
            $memberOf = [$memberOf];
        }
        foreach ($memberOf as $groupDn) {
            if (preg_match('/^[Cc][Nn]=([^,]+)/', $groupDn, $m)) {
                $groups[] = $m[1];
            }
        }

        return [
            'name'   => $results['cn'][0] ?? ($results['givenname'][0] ?? $uid),
            'email'  => $results['mail'][0] ?? null,
            'groups' => $groups,
        ];
    }
}