<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use RuntimeException;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

/**
 * Exécute un script Python en subprocess et parse sa sortie JSON.
 *
 * Les scripts sont conçus pour écrire leur résultat JSON sur stdout et
 * leurs erreurs JSON sur stderr. Cette classe propage l'erreur Python
 * sous forme de RuntimeException lisible et logge les erreurs pour debug.
 */
class PythonScriptRunner
{
    /**
     * @param  array<string, string|null>  $env     Variables d'env passées au script.
     * @param  string|null                 $stdin   Contenu à injecter sur stdin (JSON VTOM p. ex.).
     * @param  int                         $timeout Timeout en secondes.
     *
     * @return array<string, mixed> Sortie JSON décodée.
     *
     * @throws RuntimeException En cas d'échec d'exécution ou de JSON invalide.
     */
    public function run(string $scriptPath, array $env, ?string $stdin = null, int $timeout = 60): array
    {
        $process = new Process(
            ['python3', $scriptPath],
            dirname($scriptPath),
            $env,
            $stdin,
            $timeout
        );

        try {
            $process->mustRun();
        } catch (ProcessFailedException) {
            $raw     = $process->getErrorOutput();
            $decoded = json_decode($raw, true);
            $message = $decoded['message'] ?? $decoded['error'] ?? $raw;

            Log::error('Python script failed', [
                'script'   => $scriptPath,
                'exitCode' => $process->getExitCode(),
                'stderr'   => $raw,
            ]);

            throw new RuntimeException($message);
        }

        $data = json_decode($process->getOutput(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new RuntimeException('Réponse JSON invalide : ' . json_last_error_msg());
        }

        return $data;
    }
}
