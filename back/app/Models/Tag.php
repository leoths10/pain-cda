<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Tag de classement d'un calque (relation n-n avec PlanDoc).
 *
 * @property int    $id
 * @property string $label
 * @property string $color
 */
class Tag extends Model
{
    protected $fillable = [
        'label',
        'color',
    ];

    public function planDocs(): BelongsToMany
    {
        return $this->belongsToMany(PlanDoc::class);
    }
}
