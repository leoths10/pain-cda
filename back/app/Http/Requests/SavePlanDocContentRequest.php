<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation de la sauvegarde du contenu complet d'un calque
 * (annotations + flèches, en un seul envoi).
 */
class SavePlanDocContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'annotations'          => ['present', 'array'],
            'annotations.*.uid'    => ['required', 'string', 'max:64'],
            'annotations.*.text'   => ['nullable', 'string', 'max:2000'],
            'annotations.*.x'      => ['required', 'numeric'],
            'annotations.*.y'      => ['required', 'numeric'],
            'annotations.*.width'  => ['required', 'numeric'],
            'annotations.*.height' => ['required', 'numeric'],
            'annotations.*.color'  => ['nullable', 'string', 'max:16'],

            'arrows'                => ['present', 'array'],
            'arrows.*.from_uid'     => ['required', 'string', 'max:64'],
            'arrows.*.target_type'  => ['required', 'string', 'in:app,job,annotation'],
            'arrows.*.target_ref'   => ['required', 'string', 'max:255'],
            'arrows.*.color'        => ['nullable', 'string', 'max:16'],
        ];
    }
}
