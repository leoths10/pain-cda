<?php

return [

    // Dossier contenant fetch_vtom.py et fetch_scripts.py
    'scripts_path' => env('VTOM_SCRIPTS_PATH', base_path('scripts')),

    // Mode local : sert le plan depuis un fichier tours.json au lieu du SSH.
    // Utile quand le serveur VTOM n'est pas accessible (démo, dev hors réseau).
    'local' => [
        'enabled' => env('VTOM_LOCAL_MODE', false),
        'file'    => env('VTOM_LOCAL_FILE', storage_path('app/tours.json')),
    ],

    'cache' => [
        'tours_key'            => 'vtom_tours_data',
        'chaine_batch_key'     => 'vtom_chaine_batch_all',
        'paysage_version_key'  => 'vtom_paysage_version',
        'duration'             => env('VTOM_CACHE_DURATION', 300),
    ],

    // Timeouts des scripts Python (secondes)
    'timeouts' => [
        'fetch_tours'  => 60,
        'fetch_script' => 30,
        'bulk_scan'    => 120,
    ],

    // Connexion SSH au serveur VTOM (récupération du plan)
    'ssh' => [
        'host'      => env('VTOM_SSH_HOST'),
        'port'      => env('VTOM_SSH_PORT', '22'),
        'username'  => env('VTOM_SSH_USERNAME'),
        'password'  => env('VTOM_SSH_PASSWORD'),
        'file_path' => env('VTOM_SSH_FILE_PATH'),
    ],

    // Connexion SSH via jump host (récupération des scripts)
    'jump' => [
        'host'     => env('JUMP_HOST'),
        'port'     => env('JUMP_PORT', '22'),
        'username' => env('JUMP_USERNAME'),
        'password' => env('JUMP_PASSWORD'),
    ],

    'target' => [
        'host'     => env('TARGET_HOST'),
        'port'     => env('TARGET_PORT', '22'),
        'username' => env('TARGET_USERNAME'),
        'password' => env('TARGET_PASSWORD'),
    ],

];
