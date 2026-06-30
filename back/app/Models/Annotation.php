<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un encadré de texte positionné sur le plan, rattaché à un calque.
 *
 * @property int    $id
 * @property int    $plan_doc_id
 * @property string $uid
 * @property string $text
 * @property float  $x
 * @property float  $y
 * @property float  $width
 * @property float  $height
 * @property string $color
 */
class Annotation extends Model
{
    protected $fillable = [
        'plan_doc_id',
        'uid',
        'text',
        'x',
        'y',
        'width',
        'height',
        'color',
    ];

    protected $casts = [
        'x'      => 'float',
        'y'      => 'float',
        'width'  => 'float',
        'height' => 'float',
    ];

    public function planDoc(): BelongsTo
    {
        return $this->belongsTo(PlanDoc::class);
    }
}
