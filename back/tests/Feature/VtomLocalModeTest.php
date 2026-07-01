<?php

namespace Tests\Feature;

use App\Services\VtomDataService;
use RuntimeException;
use Tests\TestCase;

/**
 * Vérifie le mode local : le plan VTOM est lu depuis un fichier tours.json
 * au lieu d'être récupéré via SSH.
 */
class VtomLocalModeTest extends TestCase
{
    public function test_le_mode_local_lit_le_plan_depuis_un_fichier(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'tours');
        file_put_contents($file, json_encode([
            'Domain' => ['Environments' => ['Environment' => ['@name' => 'PAY']]],
        ]));

        config(['vtom.local.enabled' => true, 'vtom.local.file' => $file]);

        $result = app(VtomDataService::class)->getTours(true);

        $this->assertFalse($result['cached']);
        $this->assertArrayHasKey('Domain', $result['data']);
        $this->assertSame('PAY', $result['data']['Domain']['Environments']['Environment']['@name']);

        @unlink($file);
    }

    public function test_le_mode_local_echoue_si_le_fichier_est_absent(): void
    {
        config([
            'vtom.local.enabled' => true,
            'vtom.local.file'    => '/chemin/inexistant/tours.json',
        ]);

        $this->expectException(RuntimeException::class);
        app(VtomDataService::class)->getTours(true);
    }
}
