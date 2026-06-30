<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Représente un agent authentifié via LDAP.
 *
 * Les champs uid/name/email/groups sont synchronisés depuis l'annuaire à chaque login.
 * Pas de colonne password en base : l'authentification est entièrement déléguée au LDAP.
 */
class User extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'uid',
        'name',
        'email',
        'groups',
    ];

    protected $casts = [
        'groups' => 'array',
    ];

    // Pas de colonne password — l'authentification est déléguée au LDAP.
    protected $hidden = [];
}
