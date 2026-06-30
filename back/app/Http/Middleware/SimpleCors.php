<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware CORS minimal pour autoriser les appels depuis le frontend React.
 *
 * Ajoute les en-têtes `Access-Control-*` sur toutes les réponses et répond
 * directement aux requêtes preflight OPTIONS.
 */
class SimpleCors
{
    private const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
    private const ALLOWED_HEADERS = 'Content-Type, Accept, Authorization, X-Requested-With';

    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin');

        if ($request->isMethod('OPTIONS')) {
            return $this->applyCors(response('', 200), $origin)
                ->header('Access-Control-Max-Age', '86400');
        }

        return $this->applyCors($next($request), $origin);
    }

    private function applyCors(Response $response, ?string $origin): Response
    {
        if ($origin) {
            $response->header('Access-Control-Allow-Origin', $origin);
            $response->header('Access-Control-Allow-Credentials', 'true');
            $response->header('Vary', 'Origin');
        }

        return $response
            ->header('Access-Control-Allow-Methods', self::ALLOWED_METHODS)
            ->header('Access-Control-Allow-Headers', self::ALLOWED_HEADERS);
    }
}
