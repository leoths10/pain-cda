<?php

namespace App\Http\Controllers;

use App\Http\Requests\SavePlanDocContentRequest;
use App\Http\Requests\StorePlanDocRequest;
use App\Models\PlanDoc;
use App\Models\Tag;
use App\Repositories\DocRepository;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

/**
 * Couche documentaire : calques d'annotation posés sur le plan VTOM.
 *
 * Toutes les routes sont protégées par `auth:sanctum`. L'auteur d'un calque est
 * l'utilisateur LDAP connecté (`$request->user()`). Un compteur de vues par
 * calque est tenu dans Redis (donnée volatile, hors base relationnelle).
 */
class DocumentationController extends Controller
{
    public function __construct(
        private readonly DocRepository $docs,
    ) {}

    /** GET /api/plan-docs */
    public function index(): JsonResponse
    {
        return response()->json($this->docs->listDocs());
    }

    /** GET /api/plan-docs/stats */
    public function stats(): JsonResponse
    {
        return response()->json($this->docs->stats());
    }

    /** GET /api/plan-docs/{id} */
    public function show(int $id): JsonResponse
    {
        $doc = $this->docs->find($id);
        if (!$doc) {
            return response()->json(['error' => 'Calque introuvable.'], 404);
        }

        $views = $this->incrementViews($id);

        return response()->json($this->docPayload($doc, $views));
    }

    /** POST /api/plan-docs */
    public function store(StorePlanDocRequest $request): JsonResponse
    {
        $doc = $this->docs->create($request->validated(), $request->user()?->id);

        return response()->json($this->docPayload($doc), 201);
    }

    /** PUT /api/plan-docs/{id} — métadonnées (titre, description, tags) */
    public function updateMeta(StorePlanDocRequest $request, int $id): JsonResponse
    {
        $doc = PlanDoc::find($id);
        if (!$doc) {
            return response()->json(['error' => 'Calque introuvable.'], 404);
        }

        $doc = $this->docs->updateMeta($doc, $request->validated());

        return response()->json($this->docPayload($doc));
    }

    /** PUT /api/plan-docs/{id}/content — sauvegarde annotations + flèches */
    public function saveContent(SavePlanDocContentRequest $request, int $id): JsonResponse
    {
        $doc = PlanDoc::find($id);
        if (!$doc) {
            return response()->json(['error' => 'Calque introuvable.'], 404);
        }

        try {
            $doc = $this->docs->saveContent(
                $doc,
                $request->validated('annotations'),
                $request->validated('arrows'),
            );
        } catch (Throwable $e) {
            Log::error('saveContent', ['id' => $id, 'message' => $e->getMessage()]);
            return response()->json(['error' => 'Échec de la sauvegarde du calque.'], 500);
        }

        return response()->json($this->docPayload($doc));
    }

    /** DELETE /api/plan-docs/{id} */
    public function destroy(int $id): JsonResponse
    {
        $doc = PlanDoc::find($id);
        if (!$doc) {
            return response()->json(['error' => 'Calque introuvable.'], 404);
        }

        $this->docs->delete($doc);
        Redis::del("plandoc:views:{$id}");

        return response()->json(['message' => 'Calque supprimé.']);
    }

    /** GET /api/tags */
    public function tags(): JsonResponse
    {
        return response()->json(Tag::orderBy('label')->get(['id', 'label', 'color']));
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /** Incrémente et retourne le compteur de vues Redis (best-effort). */
    private function incrementViews(int $id): ?int
    {
        try {
            return (int) Redis::incr("plandoc:views:{$id}");
        } catch (Throwable $e) {
            Log::warning('plandoc views incr failed', ['id' => $id, 'message' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Sérialise un calque pour le frontend. Les flèches exposent l'`uid` de leur
     * annotation source (`from_uid`) plutôt que la FK SQL, pour que le client
     * travaille entièrement en espace d'uid.
     */
    private function docPayload(PlanDoc $doc, ?int $views = null): array
    {
        $idToUid = $doc->annotations->pluck('uid', 'id');

        return [
            'id'          => $doc->id,
            'title'       => $doc->title,
            'description' => $doc->description,
            'created_by'  => $doc->creator?->only(['uid', 'name']),
            'updated_at'  => $doc->updated_at?->toIso8601String(),
            'views'       => $views,
            'tags'        => $doc->tags->map(fn ($t) => [
                'label' => $t->label,
                'color' => $t->color,
            ])->values(),
            'annotations' => $doc->annotations->map(fn ($a) => [
                'uid'    => $a->uid,
                'text'   => $a->text,
                'x'      => $a->x,
                'y'      => $a->y,
                'width'  => $a->width,
                'height' => $a->height,
                'color'  => $a->color,
            ])->values(),
            'arrows'      => $doc->arrows->map(fn ($ar) => [
                'from_uid'    => $idToUid[$ar->from_annotation_id] ?? null,
                'target_type' => $ar->target_type,
                'target_ref'  => $ar->target_ref,
                'color'       => $ar->color,
            ])->filter(fn ($a) => $a['from_uid'] !== null)->values(),
        ];
    }
}
