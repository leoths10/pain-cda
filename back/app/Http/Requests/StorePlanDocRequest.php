<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validation de la création / mise à jour des métadonnées d'un calque.
 */
class StorePlanDocRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // l'accès est déjà restreint par le middleware auth:sanctum
    }

    public function rules(): array
    {
        return [
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'tags'        => ['nullable', 'array'],
            'tags.*'      => ['string', 'max:64'],
        ];
    }
}
