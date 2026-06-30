# Modèle de données — Couche documentaire (calques d'annotation)

> Livrable de modélisation, compétence **BC02 — « Concevoir et mettre en place une
> base de données relationnelle »** (référentiel CDA RNCP 37873).

## 1. Contexte

Le plan VTOM (applications, traitements, liens) est en **lecture seule** : il
provient d'un fichier XML distant, jamais persisté en base métier. La couche
documentaire ajoute une **couche d'écriture** par-dessus : des utilisateurs
authentifiés (LDAP) créent des **calques** (« documentations ») dans lesquels ils
posent des **annotations** et tracent des **flèches** vers les applications du plan.

Les entités VTOM ne sont donc **pas** des tables : on les référence par leur
**clé** (nom de l'application), stockée en chaîne dans `arrows.target_ref`.

## 2. MCD (Modèle Conceptuel de Données)

```
USERS (existant, cache LDAP)
  └─1,n─ CRÉE ─── PLAN_DOCS
                     ├─1,n─ CONTIENT ─── ANNOTATIONS
                     ├─1,n─ CONTIENT ─── ARROWS ───0,n─ PART_DE ─── ANNOTATIONS
                     └─0,n─ EST_CLASSÉ ── TAGS        (relation n-n via PLAN_DOC_TAG)
```

- Un **utilisateur** crée 0..n **calques** ; un calque a 1 créateur.
- Un **calque** contient 0..n **annotations** et 0..n **flèches**.
- Une **flèche** part d'une annotation (`from_annotation_id`) et pointe une cible
  (`target_type` + `target_ref`) : une application VTOM, un traitement, ou une
  autre annotation.
- Un **calque** porte 0..n **tags** ; un tag classe 0..n calques → relation **n-n**.

## 3. MLD (Modèle Logique de Données)

```
users(id, uid, name, email, groups, …)                          ← existant
plan_docs(id, title, description, #created_by→users.id, timestamps)
annotations(id, #plan_doc_id→plan_docs.id, uid, text, x, y, width, height, color, timestamps)
arrows(id, #plan_doc_id→plan_docs.id, #from_annotation_id→annotations.id,
       target_type, target_ref, color, timestamps)
tags(id, label, color, timestamps)
plan_doc_tag(#plan_doc_id→plan_docs.id, #tag_id→tags.id)         ← table d'association n-n
```

Légende : `#` = clé étrangère. Cardinalités appliquées en base via contraintes
`FOREIGN KEY` + `ON DELETE CASCADE` (annotations/arrows/pivot suivent la
suppression du calque) et `ON DELETE SET NULL` (`created_by` si l'utilisateur
disparaît).

## 4. Dictionnaire de données

### `plan_docs` — un calque documentaire

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | bigint | PK, auto | Identifiant |
| `title` | varchar(255) | NOT NULL | Nom du calque (ex. « Flux critique J+1 ») |
| `description` | text | NULL | Description libre |
| `created_by` | bigint | FK→users, NULL ON DELETE SET NULL | Auteur (identité LDAP) |
| `created_at` / `updated_at` | timestamp | | Traçabilité |

### `annotations` — un encadré positionné sur le plan

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | bigint | PK, auto | Identifiant |
| `plan_doc_id` | bigint | FK→plan_docs, NOT NULL, CASCADE | Calque parent |
| `uid` | varchar(64) | NOT NULL, unique(plan_doc_id, uid) | Identifiant client stable (lien avec les flèches) |
| `text` | text | NOT NULL | Contenu de l'annotation |
| `x` / `y` | double | NOT NULL | Position dans le repère du plan |
| `width` / `height` | double | NOT NULL | Dimensions de l'encadré |
| `color` | varchar(16) | défaut `#fbbf24` | Couleur de l'encadré |
| `created_at` / `updated_at` | timestamp | | |

### `arrows` — une flèche annotation → cible

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | bigint | PK, auto | Identifiant |
| `plan_doc_id` | bigint | FK→plan_docs, NOT NULL, CASCADE | Calque parent |
| `from_annotation_id` | bigint | FK→annotations, NOT NULL, CASCADE | Annotation source |
| `target_type` | varchar(16) | NOT NULL (`app`/`job`/`annotation`) | Nature de la cible |
| `target_ref` | varchar(255) | NOT NULL | Clé VTOM de l'app, ou `uid` d'annotation |
| `color` | varchar(16) | défaut `#ef4444` | Couleur du trait |
| `created_at` / `updated_at` | timestamp | | |

### `tags` — catégorie de calque

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | bigint | PK, auto | Identifiant |
| `label` | varchar(64) | NOT NULL, UNIQUE | Libellé (ex. `paie`, `critique`) |
| `color` | varchar(16) | défaut `#6b7280` | Couleur d'affichage |

### `plan_doc_tag` — association n-n calque ↔ tag

| Colonne | Type | Contraintes |
|---------|------|-------------|
| `plan_doc_id` | bigint | FK→plan_docs, CASCADE, PK composite |
| `tag_id` | bigint | FK→tags, CASCADE, PK composite |

## 5. Choix de conception notables

- **`annotations.uid`** : les flèches référencent les annotations par un id client
  stable plutôt que par l'`id` SQL. La sauvegarde d'un calque (« replace »
  transactionnel : on vide puis réinsère annotations + flèches) peut ainsi
  reconstruire les liens sans dépendre des `id` auto-incrémentés. La FK SQL
  `from_annotation_id` est résolue côté serveur à partir de l'`uid`.
- **Intégrité référentielle** : `ON DELETE CASCADE` garantit qu'aucune annotation
  ou flèche orpheline ne survit à la suppression d'un calque.
- **NoSQL (Redis)** : un compteur de vues par calque (`plandoc:views:{id}`) est
  tenu dans Redis (déjà en place pour l'auth) — donnée volatile hors du modèle
  relationnel.
