<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Une flèche d'un calque : d'une annotation source vers une cible
 * (application VTOM, traitement, ou autre annotation).
 *
 * @property int    $id
 * @property int    $plan_doc_id
 * @property int    $from_annotation_id
 * @property string $target_type
 * @property string $target_ref
 * @property string $color
 */
class Arrow extends Model
{
    protected $fillable = [
        'plan_doc_id',
        'from_annotation_id',
        'target_type',
        'target_ref',
        'color',
    ];

    public function planDoc(): BelongsTo
    {
        return $this->belongsTo(PlanDoc::class);
    }

    public function fromAnnotation(): BelongsTo
    {
        return $this->belongsTo(Annotation::class, 'from_annotation_id');
    }
}
