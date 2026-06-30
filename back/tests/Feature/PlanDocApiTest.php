<?php

namespace Tests\Feature;

use App\Models\PlanDoc;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tests d'intégration des endpoints de la couche documentaire (/api/plan-docs).
 * Base SQLite en mémoire (RefreshDatabase) ; authentification simulée via Sanctum
 * (pas de LDAP réel nécessaire).
 */
class PlanDocApiTest extends TestCase
{
    use RefreshDatabase;

    /** Crée un utilisateur et l'authentifie pour la requête. */
    private function actingUser(): User
    {
        $user = User::create([
            'uid'    => 'tester',
            'name'   => 'Testeur',
            'email'  => 'tester@example.fr',
            'groups' => [],
        ]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function annotation(string $uid, array $over = []): array
    {
        return array_merge([
            'uid' => $uid, 'text' => "Note $uid",
            'x' => 10, 'y' => 20, 'width' => 100, 'height' => 50, 'color' => '#fbbf24',
        ], $over);
    }

    public function test_les_routes_exigent_une_authentification(): void
    {
        $this->getJson('/api/plan-docs')->assertUnauthorized();
    }

    public function test_creation_d_un_calque_avec_tags(): void
    {
        $user = $this->actingUser();

        $this->postJson('/api/plan-docs', [
            'title'       => 'Flux critique J+1',
            'description' => 'Le flux de paie du lendemain',
            'tags'        => ['paie', 'critique'],
        ])
            ->assertCreated()
            ->assertJsonPath('title', 'Flux critique J+1')
            ->assertJsonPath('created_by.uid', 'tester');

        $this->assertDatabaseHas('plan_docs', [
            'title' => 'Flux critique J+1', 'created_by' => $user->id,
        ]);
        $this->assertDatabaseCount('tags', 2);          // relation n-n alimentée
        $this->assertDatabaseCount('plan_doc_tag', 2);
    }

    public function test_creation_refuse_sans_titre(): void
    {
        $this->actingUser();
        $this->postJson('/api/plan-docs', ['description' => 'sans titre'])
            ->assertStatus(422);
    }

    public function test_liste_des_calques(): void
    {
        $this->actingUser();
        PlanDoc::create(['title' => 'A']);
        PlanDoc::create(['title' => 'B']);

        $this->getJson('/api/plan-docs')->assertOk()->assertJsonCount(2);
    }

    public function test_lecture_d_un_calque(): void
    {
        $this->actingUser();
        $doc = PlanDoc::create(['title' => 'Lisible', 'description' => 'desc']);

        $this->getJson("/api/plan-docs/{$doc->id}")
            ->assertOk()
            ->assertJsonPath('title', 'Lisible')
            ->assertJsonPath('description', 'desc');
    }

    public function test_lecture_calque_inexistant_renvoie_404(): void
    {
        $this->actingUser();
        $this->getJson('/api/plan-docs/9999')->assertNotFound();
    }

    public function test_sauvegarde_persiste_annotations_et_fleches(): void
    {
        $this->actingUser();
        $doc = PlanDoc::create(['title' => 'Contenu']);

        $payload = [
            'annotations' => [
                $this->annotation('u1'),
                $this->annotation('u2', ['x' => 200, 'y' => 80]),
            ],
            'arrows' => [
                ['from_uid' => 'u1', 'target_type' => 'app',        'target_ref' => 'PAY_APP', 'color' => '#ef4444'],
                ['from_uid' => 'u2', 'target_type' => 'annotation', 'target_ref' => 'u1',      'color' => '#ef4444'],
            ],
        ];

        $this->putJson("/api/plan-docs/{$doc->id}/content", $payload)
            ->assertOk()
            ->assertJsonCount(2, 'annotations')
            ->assertJsonCount(2, 'arrows')
            ->assertJsonPath('arrows.0.from_uid', 'u1');   // l'uid source est bien restitué

        $this->assertDatabaseCount('annotations', 2);
        $this->assertDatabaseCount('arrows', 2);
    }

    public function test_la_sauvegarde_remplace_le_contenu_precedent(): void
    {
        $this->actingUser();
        $doc = PlanDoc::create(['title' => 'Replace']);

        $this->putJson("/api/plan-docs/{$doc->id}/content", [
            'annotations' => [$this->annotation('ancien')], 'arrows' => [],
        ])->assertOk();

        $this->putJson("/api/plan-docs/{$doc->id}/content", [
            'annotations' => [$this->annotation('neuf1'), $this->annotation('neuf2')], 'arrows' => [],
        ])->assertOk()->assertJsonCount(2, 'annotations');

        $this->assertDatabaseCount('annotations', 2);
        $this->assertDatabaseMissing('annotations', ['uid' => 'ancien']);
    }

    public function test_les_fleches_orphelines_sont_ignorees(): void
    {
        $this->actingUser();
        $doc = PlanDoc::create(['title' => 'Orphan']);

        $this->putJson("/api/plan-docs/{$doc->id}/content", [
            'annotations' => [$this->annotation('u1')],
            'arrows' => [
                ['from_uid' => 'u1',      'target_type' => 'app', 'target_ref' => 'APP', 'color' => '#ef4444'],
                ['from_uid' => 'inconnu', 'target_type' => 'app', 'target_ref' => 'APP', 'color' => '#ef4444'],
            ],
        ])->assertOk()->assertJsonCount(1, 'arrows');

        $this->assertDatabaseCount('arrows', 1);
    }

    public function test_validation_du_contenu_rejette_un_type_de_cible_invalide(): void
    {
        $this->actingUser();
        $doc = PlanDoc::create(['title' => 'Bad']);

        $this->putJson("/api/plan-docs/{$doc->id}/content", [
            'annotations' => [$this->annotation('u1')],
            'arrows' => [['from_uid' => 'u1', 'target_type' => 'INVALIDE', 'target_ref' => 'x']],
        ])->assertStatus(422);
    }

    public function test_suppression_cascade_le_contenu(): void
    {
        $this->actingUser();
        $doc = PlanDoc::create(['title' => 'ToDelete']);

        $this->putJson("/api/plan-docs/{$doc->id}/content", [
            'annotations' => [$this->annotation('u1')],
            'arrows' => [['from_uid' => 'u1', 'target_type' => 'app', 'target_ref' => 'APP', 'color' => '#ef4444']],
        ])->assertOk();

        $this->deleteJson("/api/plan-docs/{$doc->id}")->assertOk();

        $this->assertDatabaseMissing('plan_docs', ['id' => $doc->id]);
        $this->assertDatabaseCount('annotations', 0);   // ON DELETE CASCADE
        $this->assertDatabaseCount('arrows', 0);
    }

    public function test_endpoint_tags_liste_les_tags_crees(): void
    {
        $this->actingUser();
        $this->postJson('/api/plan-docs', ['title' => 'Tagged', 'tags' => ['alpha', 'beta']])
            ->assertCreated();

        $this->getJson('/api/tags')->assertOk()->assertJsonCount(2);
    }
}
