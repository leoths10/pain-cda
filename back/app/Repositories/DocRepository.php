<?php

namespace App\Repositories;

use App\Models\PlanDoc;
use App\Models\Tag;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Composant d'accès aux données de la couche documentaire (CRUD des calques).
 *
 * Concentre toute la logique SQL : lecture avec agrégats, sauvegarde
 * transactionnelle du contenu d'un calque (« replace » annotations + flèches),
 * synchronisation des tags (n-n) et statistiques.
 */
class DocRepository
{
    /** Liste des calques avec compteurs et tags (pour l'écran de sélection). */
    public function listDocs(): Collection
    {
        return PlanDoc::query()
            ->withCount(['annotations', 'arrows'])
            ->with(['tags:id,label,color', 'creator:id,uid,name'])
            ->orderByDesc('updated_at')
            ->get();
    }

    /** Charge un calque complet (annotations + flèches + tags) ou null. */
    public function find(int $id): ?PlanDoc
    {
        return PlanDoc::query()
            ->with(['annotations', 'arrows', 'tags', 'creator:id,uid,name'])
            ->find($id);
    }

    /** Crée un calque vide rattaché à son auteur. */
    public function create(array $data, ?int $userId): PlanDoc
    {
        $doc = PlanDoc::create([
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'created_by'  => $userId,
        ]);

        $this->syncTags($doc, $data['tags'] ?? []);

        return $doc->load(['annotations', 'arrows', 'tags', 'creator:id,uid,name']);
    }

    /** Met à jour les métadonnées (titre, description, tags) d'un calque. */
    public function updateMeta(PlanDoc $doc, array $data): PlanDoc
    {
        $doc->update([
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
        ]);

        $this->syncTags($doc, $data['tags'] ?? []);

        return $doc->load(['annotations', 'arrows', 'tags', 'creator:id,uid,name']);
    }

    public function delete(PlanDoc $doc): void
    {
        $doc->delete(); // CASCADE supprime annotations, flèches et liens de tags
    }

    /**
     * Remplace tout le contenu d'un calque en une transaction.
     *
     * Les flèches référencent les annotations par leur `uid` client : on insère
     * d'abord les annotations (en mémorisant uid → id SQL), puis les flèches en
     * résolvant la FK `from_annotation_id`. Une flèche dont l'annotation source
     * est absente est ignorée (pas de flèche orpheline).
     */
    public function saveContent(PlanDoc $doc, array $annotations, array $arrows): PlanDoc
    {
        return DB::transaction(function () use ($doc, $annotations, $arrows) {
            $doc->arrows()->delete();
            $doc->annotations()->delete();

            $uidToId = [];
            foreach ($annotations as $a) {
                $created = $doc->annotations()->create([
                    'uid'    => $a['uid'],
                    'text'   => $a['text'] ?? '',
                    'x'      => $a['x'],
                    'y'      => $a['y'],
                    'width'  => $a['width'],
                    'height' => $a['height'],
                    'color'  => $a['color'] ?? '#fbbf24',
                ]);
                $uidToId[$a['uid']] = $created->id;
            }

            foreach ($arrows as $ar) {
                $fromId = $uidToId[$ar['from_uid']] ?? null;
                if ($fromId === null) {
                    continue;
                }
                $doc->arrows()->create([
                    'from_annotation_id' => $fromId,
                    'target_type'        => $ar['target_type'],
                    'target_ref'         => $ar['target_ref'],
                    'color'              => $ar['color'] ?? '#ef4444',
                ]);
            }

            $doc->touch();

            return $doc->load(['annotations', 'arrows', 'tags', 'creator:id,uid,name']);
        });
    }

    /** Crée/retrouve les tags par libellé et les synchronise sur le calque (n-n). */
    public function syncTags(PlanDoc $doc, array $labels): void
    {
        $ids = [];
        foreach ($labels as $label) {
            $label = trim((string) $label);
            if ($label === '') {
                continue;
            }
            $ids[] = Tag::firstOrCreate(['label' => $label])->id;
        }
        $doc->tags()->sync($ids);
    }

    /**
     * Statistiques d'usage. La requête « top calques les plus annotés » illustre
     * une jointure + agrégat (GROUP BY / COUNT).
     */
    public function stats(): array
    {
        $topDocumented = DB::table('plan_docs')
            ->leftJoin('annotations', 'annotations.plan_doc_id', '=', 'plan_docs.id')
            ->select('plan_docs.id', 'plan_docs.title', DB::raw('COUNT(annotations.id) AS annotations_count'))
            ->groupBy('plan_docs.id', 'plan_docs.title')
            ->orderByDesc('annotations_count')
            ->limit(10)
            ->get();

        return [
            'docs_total'     => DB::table('plan_docs')->count(),
            'tags_total'     => DB::table('tags')->count(),
            'top_documented' => $topDocumented,
        ];
    }
}
