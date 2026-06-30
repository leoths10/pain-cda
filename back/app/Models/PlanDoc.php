<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Un calque documentaire posé sur le plan VTOM.
 *
 * @property int    $id
 * @property string $title
 * @property ?string $description
 * @property ?int   $created_by
 */
class PlanDoc extends Model
{
    protected $fillable = [
        'title',
        'description',
        'created_by',
    ];

    /** Annotations contenues dans ce calque. */
    public function annotations(): HasMany
    {
        return $this->hasMany(Annotation::class);
    }

    /** Flèches contenues dans ce calque. */
    public function arrows(): HasMany
    {
        return $this->hasMany(Arrow::class);
    }

    /** Tags de classement (relation n-n). */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    /** Utilisateur (LDAP) ayant créé le calque. */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
