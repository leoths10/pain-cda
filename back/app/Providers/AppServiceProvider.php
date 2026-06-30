<?php

namespace App\Providers;

use App\Services\PythonScriptRunner;
use App\Services\VtomConfig;
use App\Services\VtomDataService;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\Sanctum;
use LdapRecord\Laravel\LdapServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Enregistrement manuel du provider LDAP (non auto-découvert).
        $this->app->register(LdapServiceProvider::class);

        // Singletons : une seule instance partagée par requête pour éviter
        // de relire la config ou de recréer les connexions à chaque injection.
        $this->app->singleton(VtomConfig::class);
        $this->app->singleton(PythonScriptRunner::class);
        $this->app->singleton(VtomDataService::class);
    }

    public function boot(): void
    {
        // Utilise le modèle Sanctum par défaut (pas de modèle personnalisé).
        Sanctum::usePersonalAccessTokenModel(\Laravel\Sanctum\PersonalAccessToken::class);
    }
}
