<?php

namespace App\Services;

/**
 * Expose la configuration VTOM (SSH, chemins Python, cache) avec validation
 * des variables d'environnement requises.
 */
class VtomConfig
{
    public function scriptsPath(): string
    {
        return rtrim(config('vtom.scripts_path'), '/');
    }

    public function fetchToursScript(): string
    {
        return $this->scriptsPath() . '/fetch_vtom.py';
    }

    public function fetchScriptsScript(): string
    {
        return $this->scriptsPath() . '/fetch_scripts.py';
    }

    public function fetchPaysageVersionScript(): string
    {
        return $this->scriptsPath() . '/fetch_paysage_version.py';
    }

    public function cacheKey(string $which): string
    {
        return config("vtom.cache.{$which}_key");
    }

    public function cacheDuration(): int
    {
        return (int) config('vtom.cache.duration');
    }

    public function timeout(string $which): int
    {
        return (int) config("vtom.timeouts.{$which}");
    }

    /** Variables d'environnement à passer à fetch_vtom.py. */
    public function toursEnv(): array
    {
        return [
            'VTOM_SSH_HOST'      => config('vtom.ssh.host'),
            'VTOM_SSH_PORT'      => config('vtom.ssh.port'),
            'VTOM_SSH_USERNAME'  => config('vtom.ssh.username'),
            'VTOM_SSH_PASSWORD'  => config('vtom.ssh.password'),
            'VTOM_SSH_FILE_PATH' => config('vtom.ssh.file_path'),
        ];
    }

    /** Variables d'environnement à passer à fetch_paysage_version.py (jump host uniquement). */
    public function jumpOnlyEnv(): array
    {
        return [
            'JUMP_HOST'     => config('vtom.jump.host'),
            'JUMP_PORT'     => config('vtom.jump.port'),
            'JUMP_USERNAME' => config('vtom.jump.username'),
            'JUMP_PASSWORD' => config('vtom.jump.password'),
        ];
    }

    /** Variables d'environnement à passer à fetch_scripts.py (double-hop SSH). */
    public function sshEnv(): array
    {
        return [
            'JUMP_HOST'       => config('vtom.jump.host'),
            'JUMP_PORT'       => config('vtom.jump.port'),
            'JUMP_USERNAME'   => config('vtom.jump.username'),
            'JUMP_PASSWORD'   => config('vtom.jump.password'),
            'TARGET_HOST'     => config('vtom.target.host'),
            'TARGET_PORT'     => config('vtom.target.port'),
            'TARGET_USERNAME' => config('vtom.target.username'),
            'TARGET_PASSWORD' => config('vtom.target.password'),
        ];
    }

    /**
     * Retourne les clés d'un tableau d'env dont la valeur est vide.
     *
     * @return array<int, string>
     */
    public function missingKeys(array $env): array
    {
        return array_values(array_keys(array_filter($env, fn ($v) => empty($v))));
    }

    /** Variables minimum pour considérer la config VTOM valide. */
    public function healthMissing(): array
    {
        return $this->missingKeys([
            'VTOM_SSH_HOST'     => config('vtom.ssh.host'),
            'VTOM_SSH_USERNAME' => config('vtom.ssh.username'),
            'VTOM_SSH_PASSWORD' => config('vtom.ssh.password'),
        ]);
    }
}
