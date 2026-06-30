<?php

return [

    'default' => env('LDAP_CONNECTION', 'default'),

    'connections' => [
        'default' => [
            'hosts'            => [env('LDAP_HOST', '127.0.0.1')],
            'username'         => env('LDAP_USERNAME'),
            'password'         => env('LDAP_PASSWORD'),
            'port'             => (int) env('LDAP_PORT', 389),
            'base_dn'          => env('LDAP_BASE_DN'),
            'timeout'          => 5,
            'use_ssl'          => (bool) env('LDAP_SSL', false),
            'use_tls'          => (bool) env('LDAP_TLS', false),
            'use_sasl'         => false,
        ],
    ],

    'logging' => [
        'enabled'  => env('LDAP_LOGGING', false),
        'channel'  => env('LOG_CHANNEL', 'stack'),
    ],

    'cache' => [
        'enabled'  => false,
        'driver'   => 'file',
    ],

];
