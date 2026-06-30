<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DocumentationController;
use App\Http\Controllers\VtomController;
use Illuminate\Support\Facades\Route;

// ── Health check public ───────────────────────────────────────────────────────
Route::get('/health', fn () => response()->json([
    'status'    => 'ok',
    'timestamp' => now()->toIso8601String(),
    'service'   => 'Pain API',
]));

// ── Authentification (publiques) ──────────────────────────────────────────────
// Throttle uniquement sur /login (anti-brute-force credentials).
// /refresh n'est pas throttlé : il exige le cookie httpOnly, donc spammer cette
// route sans cookie valide renvoie un 401 immédiat — pas de surface d'attaque utile.
Route::prefix('auth')->controller(AuthController::class)->group(function () {
    Route::post('/login',   'login')->middleware('throttle:5,1');
    Route::post('/refresh', 'refresh');
});

// ── Authentification (protégées) ──────────────────────────────────────────────
Route::prefix('auth')->controller(AuthController::class)
    ->middleware('auth:sanctum')
    ->group(function () {
        Route::post('/logout', 'logout');
        Route::get('/me',     'me');
    });

// ── VTOM (protégées par Sanctum) ──────────────────────────────────────────────
Route::prefix('vtom')->controller(VtomController::class)
    ->middleware('auth:sanctum')
    ->group(function () {
        Route::get('/health',               'healthCheck');
        Route::get('/tours',                'getTours');
        Route::post('/tours/refresh',       'refreshTours');
        Route::get('/tours/cache',          'getCacheInfo');
        Route::get('/script',               'getScript');
        Route::get('/scripts/chaine-batch', 'getAllChaineBatch');
        Route::get('/migrado-xml',          'getMigradoXml');
        Route::get('/paysage-version',      'getPaysageVersion');
    });

// ── Couche documentaire : calques d'annotation (protégées par Sanctum) ────────
Route::prefix('plan-docs')->controller(DocumentationController::class)
    ->middleware('auth:sanctum')
    ->group(function () {
        Route::get('/',             'index');
        Route::get('/stats',        'stats');        // avant /{id} pour ne pas être capturé
        Route::post('/',            'store');
        Route::get('/{id}',         'show')->whereNumber('id');
        Route::put('/{id}',         'updateMeta')->whereNumber('id');
        Route::put('/{id}/content', 'saveContent')->whereNumber('id');
        Route::delete('/{id}',      'destroy')->whereNumber('id');
    });

Route::get('/tags', [DocumentationController::class, 'tags'])->middleware('auth:sanctum');
