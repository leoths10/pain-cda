<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use RuntimeException;

/**
 * Orchestration des données VTOM : récupération du plan via SSH/SFTP,
 * lecture de scripts shell distants, gestion du cache Laravel.
 */
class VtomDataService
{
    public function __construct(
        private readonly VtomConfig $config,
        private readonly PythonScriptRunner $python,
    ) {}

    // ─── Plan VTOM ─────────────────────────────────────────────────────────

    /**
     * Récupère le plan VTOM (depuis le cache ou via fetch_vtom.py).
     *
     * @return array{data: array, cached: bool}
     */
    public function getTours(bool $forceRefresh = false): array
    {
        $key = $this->config->cacheKey('tours');

        if ($forceRefresh) {
            $this->forgetAllCaches();
        }

        // Cache::get distingue hit/miss en un seul round-trip (null si absent).
        $cached = Cache::get($key);
        if ($cached !== null) {
            return ['data' => $cached, 'cached' => true];
        }

        $data = $this->python->run(
            $this->config->fetchToursScript(),
            $this->config->toursEnv(),
            timeout: $this->config->timeout('fetch_tours'),
        );
        $this->cachePlan($data);

        return ['data' => $data, 'cached' => false];
    }

    /**
     * Stocke deux formes du plan : array (consommé par l'API) et JSON brut
     * (pipé vers les scripts Python). Évite un json_encode par appel script.
     */
    private function cachePlan(array $data): void
    {
        $duration = $this->config->cacheDuration();
        Cache::put($this->config->cacheKey('tours'), $data, $duration);
        Cache::put($this->toursJsonCacheKey(), json_encode($data), $duration);
    }

    private function toursJsonCacheKey(): string
    {
        return $this->config->cacheKey('tours') . ':json';
    }

    public function forgetAllCaches(): void
    {
        Cache::forget($this->config->cacheKey('tours'));
        Cache::forget($this->toursJsonCacheKey());
        Cache::forget($this->config->cacheKey('chaine_batch'));
    }

    public function cacheInfo(): array
    {
        $key = $this->config->cacheKey('tours');
        return [
            'cached'         => Cache::has($key),
            'cache_duration' => $this->config->cacheDuration(),
            'cache_key'      => $key,
        ];
    }

    // ─── Scripts shell ─────────────────────────────────────────────────────

    /**
     * Récupère le contenu d'un script unique via le jump host.
     *
     * @return array{path: string, content: string, chaine_batch: ?array}
     *
     * @throws RuntimeException Si le script est introuvable ou en erreur.
     */
    public function fetchScript(string $scriptPath): array
    {
        $vtomJson = $this->ensureToursCachedJson();

        $env = $this->config->sshEnv();
        $env['FETCH_SINGLE_SCRIPT'] = $scriptPath;

        $result = $this->python->run(
            $this->config->fetchScriptsScript(),
            $env,
            stdin: $vtomJson,
            timeout: $this->config->timeout('fetch_script'),
        );

        $fetched = $result['fetched'] ?? [];
        $errors  = $result['errors']  ?? [];

        if (!empty($fetched)) {
            $path = array_key_first($fetched);
            return [
                'path'         => $path,
                'content'      => $fetched[$path],
                'chaine_batch' => $result['chaine_batch'][$path] ?? null,
            ];
        }

        if (!empty($errors)) {
            $path = array_key_first($errors);
            throw new RuntimeException($errors[$path]);
        }

        throw new RuntimeException('Script absent de la réponse Python');
    }

    /**
     * Scanne tous les scripts référencés et retourne les CHAINE_BATCH trouvées (bulk, avec cache).
     *
     * @return array{chaine_batch: array, errors: array, skipped: array, scripts_dir: ?string, total_fetched: int}
     */
    public function fetchAllChaineBatch(): array
    {
        $cacheKey = $this->config->cacheKey('chaine_batch');

        $data = Cache::remember($cacheKey, $this->config->cacheDuration(), function () {
            return $this->python->run(
                $this->config->fetchScriptsScript(),
                $this->config->sshEnv(),
                stdin: $this->ensureToursCachedJson(),
                timeout: $this->config->timeout('bulk_scan'),
            );
        });

        return [
            'chaine_batch'  => $data['chaine_batch'] ?? [],
            'errors'        => $data['errors']       ?? [],
            'skipped'       => $data['skipped']      ?? [],
            'scripts_dir'   => $data['scriptsDir']   ?? null,
            'total_fetched' => count($data['fetched'] ?? []),
        ];
    }

    /**
     * Récupère le contenu d'un fichier XML Migrado depuis /nfs/pay01/migrado/SLR/<param>.
     *
     * @return array{param: string, path: string, content: string}
     *
     * @throws RuntimeException Si le fichier est introuvable ou en erreur.
     */
    public function fetchMigradoXml(string $paramName): array
    {
        $xmlPath = '/nfs/pay01/migrado/SLR/migrado-' . $paramName . '.xml';

        $env = $this->config->sshEnv();
        $env['FETCH_SINGLE_SCRIPT'] = $xmlPath;

        $result = $this->python->run(
            $this->config->fetchScriptsScript(),
            $env,
            stdin: '{}',
            timeout: $this->config->timeout('fetch_script'),
        );

        $fetched = $result['fetched'] ?? [];
        $errors  = $result['errors']  ?? [];

        if (!empty($fetched)) {
            $path    = array_key_first($fetched);
            $content = $fetched[$path];
            return [
                'param'   => $paramName,
                'path'    => $path,
                'content' => $content,
                'fields'  => $this->parseMigradoFields($content),
            ];
        }

        if (!empty($errors)) {
            $path = array_key_first($errors);
            throw new RuntimeException($errors[$path]);
        }

        throw new RuntimeException('Fichier XML absent de la réponse');
    }

    /**
     * Parse les champs <file ... base="..."> d'un fichier XML Migrado.
     *
     * Volontairement ligne par ligne plutôt que via un parseur XML : les fichiers
     * Migrado ne sont pas toujours bien formés (variables `${enviro}` non échappées,
     * attributs collés sans espace, encodages mixtes).
     *
     * @return array<int, array{name: string, schema: string, segment: string}>
     */
    private function parseMigradoFields(string $xmlContent): array
    {
        $fields = [];
        foreach (preg_split('/\r?\n/', $xmlContent) as $line) {
            if (preg_match('/^\s*<!--/', $line)) {
                continue;
            }
            if (!preg_match('/<file\b/i', $line) || stripos($line, 'base=') === false) {
                continue;
            }
            $name    = '';
            $schema  = '';
            $segment = '';
            if (preg_match('/\bname=["\']([^"\']*)["\']/', $line, $m))    $name    = $m[1];
            if (preg_match('/\bschema=["\']([^"\']*)["\']/', $line, $m))   $schema  = $m[1];
            if (preg_match('/\bsegment=["\']([^"\']*)["\']/', $line, $m))  $segment = $m[1];
            if ($name !== '') {
                $fields[] = ['name' => $name, 'schema' => $schema, 'segment' => $segment];
            }
        }
        return $fields;
    }

    /**
     * Récupère la version de paysage depuis le jump host.
     *
     * @return array{version: string}
     *
     * @throws RuntimeException Si la commande échoue.
     */
    public function fetchPaysageVersion(): array
    {
        return Cache::remember(
            $this->config->cacheKey('paysage_version'),
            $this->config->cacheDuration(),
            fn () => $this->python->run(
                $this->config->fetchPaysageVersionScript(),
                $this->config->jumpOnlyEnv(),
                timeout: 30,
            )
        );
    }

    /**
     * Plan VTOM sous forme JSON brute, prêt à piper sur stdin de fetch_scripts.py.
     * Alimenté par {@see cachePlan()} en parallèle de la version array.
     */
    private function ensureToursCachedJson(): string
    {
        $json = Cache::get($this->toursJsonCacheKey());
        if (is_string($json) && $json !== '') {
            return $json;
        }
        $this->getTours();
        return Cache::get($this->toursJsonCacheKey()) ?? '{}';
    }
}
