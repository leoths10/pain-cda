<?php

namespace App\Http\Controllers;

use App\Services\VtomConfig;
use App\Services\VtomDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class VtomController extends Controller
{
    public function __construct(
        private readonly VtomConfig $config,
        private readonly VtomDataService $vtom,
    ) {}

    /** GET /api/vtom/tours */
    public function getTours(Request $request): JsonResponse
    {
        try {
            $result = $this->vtom->getTours($request->boolean('force_refresh'));

            return response()->json([
                'data'      => $result['data'],
                'cached'    => $result['cached'],
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (Throwable $e) {
            Log::error('getTours', ['message' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /** POST /api/vtom/tours/refresh — force_refresh=true invalide déjà les caches. */
    public function refreshTours(): JsonResponse
    {
        return $this->getTours(new Request(['force_refresh' => true]));
    }

    /** GET /api/vtom/tours/cache */
    public function getCacheInfo(): JsonResponse
    {
        return response()->json($this->vtom->cacheInfo());
    }

    /** GET /api/vtom/health */
    public function healthCheck(): JsonResponse
    {
        if (!file_exists($this->config->fetchToursScript())) {
            return response()->json([
                'status' => 'unhealthy',
                'error'  => 'fetch_vtom.py introuvable',
            ], 503);
        }

        $missing = $this->config->healthMissing();
        if (!empty($missing)) {
            return response()->json([
                'status'  => 'unhealthy',
                'missing' => $missing,
            ], 503);
        }

        return response()->json([
            'status'         => 'healthy',
            'cache_duration' => $this->config->cacheDuration(),
        ]);
    }

    /** GET /api/vtom/script?script_path=... */
    public function getScript(Request $request): JsonResponse
    {
        $scriptPath = trim((string) $request->query('script_path', ''));
        if ($scriptPath === '') {
            return response()->json(['error' => 'Paramètre script_path requis'], 422);
        }

        if ($error = $this->checkScriptsReady()) {
            return $error;
        }

        try {
            return response()->json($this->vtom->fetchScript($scriptPath));
        } catch (Throwable $e) {
            Log::error('getScript', ['message' => $e->getMessage(), 'script' => $scriptPath]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /** GET /api/vtom/migrado-xml?param=... */
    public function getMigradoXml(Request $request): JsonResponse
    {
        $param = trim((string) $request->query('param', ''));
        if ($param === '') {
            return response()->json(['error' => 'Paramètre param requis'], 422);
        }

        if ($error = $this->checkScriptsReady()) {
            return $error;
        }

        try {
            return response()->json($this->vtom->fetchMigradoXml($param));
        } catch (Throwable $e) {
            Log::error('getMigradoXml', ['message' => $e->getMessage(), 'param' => $param]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /** GET /api/vtom/scripts/chaine-batch */
    public function getAllChaineBatch(): JsonResponse
    {
        if ($error = $this->checkScriptsReady()) {
            return $error;
        }

        try {
            return response()->json($this->vtom->fetchAllChaineBatch());
        } catch (Throwable $e) {
            Log::error('getAllChaineBatch', ['message' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /** GET /api/vtom/paysage-version */
    public function getPaysageVersion(): JsonResponse
    {
        try {
            return response()->json($this->vtom->fetchPaysageVersion());
        } catch (Throwable $e) {
            Log::error('getPaysageVersion', ['message' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Vérifie la présence de fetch_scripts.py et des variables SSH (jump + target).
     * Retourne une JsonResponse d'erreur si invalide, null si tout est OK.
     */
    private function checkScriptsReady(): ?JsonResponse
    {
        if (!file_exists($this->config->fetchScriptsScript())) {
            return response()->json([
                'error' => "fetch_scripts.py introuvable : {$this->config->fetchScriptsScript()}",
            ], 500);
        }

        $missing = $this->config->missingKeys($this->config->sshEnv());
        if (!empty($missing)) {
            return response()->json([
                'error'   => 'Variables SSH manquantes',
                'missing' => $missing,
            ], 500);
        }

        return null;
    }
}
