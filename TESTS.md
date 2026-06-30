# Plan de tests — PAIN

> Cahier de tests du projet, compétence **BC03 — « Préparer et exécuter les plans
> de tests d'une application »** (référentiel CDA RNCP 37873).

## Périmètre actuel (Étape 1 — logique pure)

Cette première vague couvre les **fonctions pures et déterministes** du projet :
entrées/sorties prévisibles, aucune dépendance externe (ni SSH, ni LDAP, ni base
de données). Elles s'exécutent en quelques millisecondes et constituent le socle
sur lequel s'appuieront les tests d'intégration (endpoints Laravel, auth LDAP
mockée) prévus en étape 2.

| Couche | Cible | Fonctions testées | Outil |
|--------|-------|-------------------|-------|
| Scripts Python | `scripts/fetch_scripts.py` | `resolve_script_path`, `extract_chaine_batch` | pytest |
| Frontend | `front/src/utils/vtomHelpers.ts` | `parseParameter`, `cleanHtmlLabel`, `wrapText`, `clipToRect` | Vitest |

**Total : 50 cas (32 Python + 18 front), 100 % au vert.**

---

## Comment exécuter

### Python (pytest)

```bash
cd scripts
pip install -r requirements.txt   # pytest inclus ; aucune infra SSH requise
pytest                            # ou : python3 -m pytest
```

> Les tests de logique pure ne nécessitent pas `paramiko` : `tests/conftest.py`
> injecte un stub si la lib n'est pas installée, ce qui permet de lancer la suite
> dans n'importe quel environnement (CI comprise).

### Frontend (Vitest)

```bash
cd front
npm install
npm test          # une passe (CI)
npm run test:watch  # mode watch (dev)
```

---

## Cahier de tests détaillé

### `resolve_script_path(raw_value, scripts_dir)` — résolution des chemins VTOM

| # | Cas | Entrée | Attendu | Statut |
|---|-----|--------|---------|:------:|
| R1 | Préfixe `#` retiré | `("#/app/foo.sh", "/scripts")` | `/app/foo.sh` | ✅ |
| R2 | Espaces après `#` | `("#  /app/foo.sh", "/scripts")` | `/app/foo.sh` | ✅ |
| R3 | Chemin absolu inchangé | `("/app/bar.sh", "/scripts")` | `/app/bar.sh` | ✅ |
| R4 | Absolu sans scriptsDir | `("/app/bar.sh", "")` | `/app/bar.sh` | ✅ |
| R5 | Relatif joint à scriptsDir | `("baz.sh", "/scripts")` | `/scripts/baz.sh` | ✅ |
| R6 | Slash final normalisé | `("baz.sh", "/scripts/")` | `/scripts/baz.sh` | ✅ |
| R7 | Sous-dossier relatif | `("sub/baz.sh", "/scripts")` | `/scripts/sub/baz.sh` | ✅ |
| R8 | Espaces de bord (absolu) | `("  /app/foo.sh  ", …)` | `/app/foo.sh` | ✅ |
| R9 | Espaces de bord (relatif) | `("  baz.sh  ", "/scripts")` | `/scripts/baz.sh` | ✅ |
| R10 | Vide / espaces / None / non-str | `""`, `"   "`, `None`, `42`, `[…]` | `None` | ✅ |
| R11 | `#` seul → rien | `("#", …)`, `("#   ", …)` | `None` | ✅ |
| R12 | Relatif sans scriptsDir | `("baz.sh", "")` | `None` | ✅ |
| R13 | `#` + relatif reste relatif | `("#baz.sh", "/scripts")` | `baz.sh` | ✅ |

### `extract_chaine_batch(content)` — extraction de la variable CHAINE_BATCH

| # | Cas | Entrée | Attendu | Statut |
|---|-----|--------|---------|:------:|
| E1 | Format simple | `CHAINE_BATCH=FOO,BAR` | `["FOO","BAR"]` | ✅ |
| E2 | Guillemets doubles | `CHAINE_BATCH="FOO,BAR"` | `["FOO","BAR"]` | ✅ |
| E3 | Guillemets simples | `CHAINE_BATCH='FOO,BAR'` | `["FOO","BAR"]` | ✅ |
| E4 | Valeur unique | `CHAINE_BATCH=FOO` | `["FOO"]` | ✅ |
| E5 | Ligne parmi d'autres | script multi-lignes | `["A","B"]` | ✅ |
| E6 | Espaces en début de ligne | `    CHAINE_BATCH=FOO,BAR` | `["FOO","BAR"]` | ✅ |
| E7 | Ligne commentée ignorée | `# CHAINE_BATCH=FOO,BAR` | `None` | ✅ |
| E8 | Occurrence en milieu de ligne ignorée | `export CHAINE_BATCH=FOO` | `None` | ✅ |
| E9 | Première occurrence retenue | 2 lignes CHAINE_BATCH | `["FIRST"]` | ✅ |
| E10 | Arrêt au point-virgule | `CHAINE_BATCH=FOO,BAR; echo` | `["FOO","BAR"]` | ✅ |
| E11 | Trim + valeurs vides écartées | `CHAINE_BATCH= FOO , , BAR ,` | `["FOO","BAR"]` | ✅ |
| E12 | Absent / vide / sans valeur / que des virgules | `""`, `CHAINE_BATCH=`, `,,,` | `None` | ✅ |

### `parseParameter(param, resources)` — résolution des ressources `{NOM}`

| # | Cas | Attendu | Statut |
|---|-----|---------|:------:|
| P1 | Référence connue résolue, texte inchangé | 1 ressource résolue | ✅ |
| P2 | Plusieurs références dans l'ordre | 2 ressources | ✅ |
| P3 | Référence inconnue ignorée | seules les connues | ✅ |
| P4 | Aucune référence | liste vide | ✅ |

### `cleanHtmlLabel(label)` — nettoyage des labels HTML

| # | Cas | Entrée | Attendu | Statut |
|---|-----|--------|---------|:------:|
| C1 | Suppression des balises | `<b>Hello</b>` | `Hello` | ✅ |
| C2 | Entités nommées (accents FR) | `caf&eacute; &amp; cr&egrave;me` | `café & crème` | ✅ |
| C3 | Entités numériques déc./hex. | `&#233;`, `&#xE9;` | `é` | ✅ |
| C4 | Normalisation des espaces | `  a   b  ` | `a b` | ✅ |
| C5 | `<br>` → coupure → espace | `ligne1<br/>ligne2` | `ligne1 ligne2` | ✅ |

### `wrapText(text, max)` — découpe en lignes

| # | Cas | Attendu | Statut |
|---|-----|---------|:------:|
| W1 | Coupe aux frontières de mots | `["one two","three"]` | ✅ |
| W2 | Ligne courte intacte | `["court"]` | ✅ |
| W3 | Mot plus long que la limite non coupé | `["supercalifragilistic"]` | ✅ |
| W4 | Retours à la ligne existants respectés | `["a","b"]` | ✅ |
| W5 | Chaîne vide | `[""]` | ✅ |

### `clipToRect(...)` — intersection droite/rectangle

| # | Cas | Attendu | Statut |
|---|-----|---------|:------:|
| K1 | Origine à droite → bord droit | `[16, 10]` | ✅ |
| K2 | Origine au-dessus → bord haut | `[10, 16]` | ✅ |
| K3 | Origine au centre → centre | `[10, 10]` | ✅ |
| K4 | Diagonale 45° → coin | `[16, 16]` | ✅ |

---

## Étape 2 — Tests d'intégration backend (couche documentaire)

Suite **PHPUnit Feature** sur les endpoints `/api/plan-docs/*`, base **SQLite en
mémoire** (`RefreshDatabase`), authentification simulée via `Sanctum::actingAs`
(pas de LDAP réel). Fichier : `back/tests/Feature/PlanDocApiTest.php`.

> `phpunit.xml` force SQLite (`force="true"` sur `DB_CONNECTION`/`DB_DATABASE`)
> pour que les tests ne visent **jamais** la base PostgreSQL réelle.

**Lancement :** `php artisan test` (ou `docker compose exec pain-back php artisan test`).
**12 tests, 37 assertions, 100 % au vert.**

| # | Cas | Attendu | Statut |
|---|-----|---------|:------:|
| F1 | Accès non authentifié | 401 | ✅ |
| F2 | Création d'un calque + tags (n-n) | 201, tags persistés | ✅ |
| F3 | Création sans titre | 422 | ✅ |
| F4 | Liste des calques | 200, 2 éléments | ✅ |
| F5 | Lecture d'un calque | 200, champs corrects | ✅ |
| F6 | Lecture d'un calque inexistant | 404 | ✅ |
| F7 | Sauvegarde annotations + flèches | persistées, `from_uid` restitué | ✅ |
| F8 | La sauvegarde remplace le contenu | ancien contenu supprimé | ✅ |
| F9 | Flèche orpheline (source inconnue) | ignorée | ✅ |
| F10 | Type de cible invalide | 422 | ✅ |
| F11 | Suppression → cascade | annotations/flèches supprimées | ✅ |
| F12 | Endpoint `/api/tags` | 200, tags listés | ✅ |

---

## Suite prévue

- **Tests de composants frontend** : Testing Library + jsdom sur un composant clé
  (toolbar documentaire, modale de recherche).
- **Intégration continue** : exécution automatique de `pytest` + `vitest` +
  `php artisan test` à chaque push (GitHub Actions).
