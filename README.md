# 🌧️ PAIN — Real-time Architecture INtegration Navigator

> **Site documentaire VTOM** — Une plateforme web full-stack pour visualiser, explorer et documenter les orchestrations VTOM.
> Récupère automatiquement le plan depuis un serveur VTOM distant via SSH/SFTP, le convertit en JSON et propose une interface SVG interactive, avec accès en lecture aux scripts shell et extraction des chaînes batch.

---

## 🚀 Quick Start

```bash
# Cloner et configurer
git clone <repository-url>
cd pain-main
cp back/.env.example back/.env
# Éditer back/.env pour renseigner les accès SSH VTOM (voir Configuration)

# Lancer
docker compose build
docker compose up -d
```

| Service | URL |
|---------|-----|
| Site (nginx) | http://localhost |
| PostgreSQL | localhost:5432 |

---

## 📑 Sommaire

1. [Vue d'ensemble](#-vue-densemble)
2. [Fonctionnalités principales](#-fonctionnalités-principales)
3. [Stack technique](#-stack-technique)
4. [Architecture](#-architecture)
5. [Installation et démarrage](#-installation-et-démarrage)
6. [Configuration](#-configuration)
7. [Structure du projet](#-structure-du-projet)
8. [API Backend](#-api-backend)
9. [Scripts Python](#-scripts-python)
10. [Frontend](#-frontend)
11. [Déploiement](#-déploiement)
12. [Maintenance et dépannage](#-maintenance-et-dépannage)

---

## 🎯 Vue d'ensemble

**PAIN** est une application web interne qui transforme le fichier XML du plan d'ordonnancement VTOM en une carte interactive accessible depuis un navigateur. Elle permet à n'importe quel collaborateur d'explorer les applications, leurs traitements et les dépendances qui les relient, sans avoir à se connecter au serveur VTOM ou à lire le XML brut.

### Ce qu'elle apporte

- 🗺️ **Visualiser** le plan complet VTOM sous forme de carte SVG interactive (zoom, pan, minimap)
- 🔍 **Rechercher** instantanément n'importe quelle application ou traitement dans tout le plan
- 📄 **Consulter** le contenu des scripts shell directement dans le navigateur, avec coloration syntaxique
- 🔗 **Extraire** les variables `CHAINE_BATCH` de tous les scripts en une seule opération, avec export CSV/JSON
- 📚 **Documenter** avec deux guides intégrés (utilisateur et développeur)
- 🎨 **Personnaliser** avec un thème clair/sombre persistant

### Positionnement par rapport à VTOM natif

Le plan VTOM est déjà consultable depuis l'application VTOM. PAIN ne le remplace pas : il vient **enrichir** cette consultation avec une navigation moderne, une recherche transversale, la lecture des scripts sans SSH, et pose les fondations d'une couche documentaire collaborative à venir — où les experts pourront renseigner directement leur connaissance métier sur les applications et traitements.

---

## ✨ Fonctionnalités principales

### 1. 🏠 Page d'accueil

Point d'entrée centralisé avec :
- **Bandeau de navigation (Hero)** : logo VTOM, titre, boutons de navigation et toggle du thème
- **Teaser « Plan VTOM »** avec CTA « Voir le plan »
- **Card « Plan XML VTOM »** mise en avant avec dégradé violet
- **Card « Documentation »** vers les guides intégrés
- **Grille d'accès rapide (Quick Access)** : Plan VTom, Recherche avancée, Documentation technique

### 2. 🗺️ Plan VTOM — La fonctionnalité centrale

Visualisation SVG interactive du plan complet (canvas 3000 × 7000 px).

**Affichage :**
- Applications colorées positionnées selon leur configuration VTOM, avec couleurs adoucies automatiquement
- Flèches de dépendance entre applications
- Colonnes verticales par domaine fonctionnel (fond coloré semi-transparent)
- Séparateurs horizontaux/verticaux avec libellés
- Feux tricolores (points de contrôle)
- Commentaires libres positionnés sur le plan

**Navigation :**
- Zoom avant/arrière via boutons `+`/`−`, curseur (30 % - 200 %) ou molette de la souris
- Drag & pan (clic-glissé sur le fond)
- Bouton `⌂ Reset` pour recentrer la vue
- Mode plein écran (🗖 / 🗗)
- Minimap en bas à droite avec rectangle de viewport déplaçable par glisser-déposer

**Interactions sur une application :**
- **Survol** → tooltip riche avec nom, statut, famille, cycle, compteurs (traitements, liens entrants/sortants), aperçu des 6 premiers traitements
- **Clic** → ouverture de la fiche détaillée

**Barre d'en-tête du plan :**
- Statistiques globales : nombre d'applications, traitements, liens, feux, commentaires, colonnes
- Horodatage de la dernière mise à jour des données
- Boutons de recherche (Applications, Traitements, CHAINE_BATCH)
- Contrôles de zoom et d'affichage
- Bouton de rafraîchissement forcé (🔄)

### 3. 📋 Fiche détaillée d'une application

Modale superposée affichant :
- Nom, statut avec emoji (✅ terminé, ⏳ attente, ▶️ en cours, 🔄 inconnu), famille, position, couleur, cycle, commentaire
- **Schéma interne interactif des traitements** avec dépendances entre jobs (flèches bleues = liens normaux, rouges = liens conditionnels) et commentaires de schéma
- Chaque traitement est cliquable
- Panneau dépliable « 📋 Voir les détails complets » avec la liste de tous les traitements

### 4. 🔧 Fiche détaillée d'un traitement

Seconde modale avec :
- Nom, statut, application parente
- Chemin du script en monospace
- **Résolution automatique des paramètres** : les références `{NOM_RESSOURCE}` sont résolues avec leur valeur et leur type depuis les ressources VTOM
- **Badges CHAINE_BATCH** cliquables si détectées dans le script → ouvre la modale des sous-programmes associés
- Grille compacte : fréquence, mode, heure min/max, code retour
- Bouton « Charger le Script » avec trois états (📄 charger / ⏳ chargement / 📄 afficher)

### 5. 📜 Visualisation des scripts

Troisième modale (z-index le plus élevé) affichant :
- Contenu complet du script shell avec **coloration syntaxique bash** (mots-clés, variables, commentaires, chaînes)
- Numéros de ligne
- Fond sombre (#1E1E1E) quel que soit le thème
- Bouton **📋 Copier** → **✅ Copié !** (fallback pour contextes non-HTTPS)
- Gestion des erreurs dans un encadré rouge si la récupération échoue

### 6. 🔎 Recherche

**Recherche d'applications** (bouton 🔎 Applications) :
- Modale plein écran avec filtrage en temps réel
- Insensible à la casse et aux accents
- Compteur de résultats, affichage de la colonne d'appartenance
- Navigation clavier : `Échap` pour fermer, `Entrée` pour sélectionner le premier résultat
- Focus automatique sur le champ

**Recherche de traitements** (bouton 🔍 Traitements) :
- Même fonctionnement, ciblé sur les traitements de toutes les applications

### 7. 🔗 Panneau CHAINE_BATCH

Bouton **🔗 CHAINE_BATCH** dans la barre du plan :
- Scan complet de tous les scripts via SSH (opération bulk)
- Badge numérique indiquant le nombre de résultats
- Liste filtrable par nom de traitement, application ou valeur de chaîne
- Exports **CSV** (séparateur `;`, compatible Excel) et **JSON**
- Clic sur un traitement → fiche détaillée
- Clic sur une valeur → modale des sous-programmes (référentiel `liste_prog`)
- Résultats mis en cache pour éviter de refaire le scan

### 8. 📚 Documentation intégrée

Deux guides accessibles via `/documentation` :
- 🧭 **Documentation utilisateur** — guide d'utilisation du site
- 💻 **Documentation développeur** — guide technique

Affichage en modale avec parsing automatique des sections numérotées (1., 2., 2.1…) et listes à puces. Contenus pilotés par JSON pour une mise à jour sans toucher au code.

### 9. 🎨 Thème clair/sombre

- Bouton de bascule dans le bandeau (🌙 / ☀️)
- Persistance cookie + localStorage (365 jours)
- Transition fluide, toutes les interfaces s'adaptent (plan, tooltips, modales, scripts, panneau CHAINE_BATCH)

### 10. 🍪 Consentement cookies (RGPD)

Bannière affichée au premier chargement. Cookies utilisés uniquement pour les préférences de thème.

---

## 🛠️ Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 19.2, TypeScript 5.7, Vite 7.2, React Router 7 |
| Backend | PHP 8.2+, Laravel 12 |
| Base de données | PostgreSQL 16 |
| Scripts | Python 3 (paramiko, xmltodict) |
| Infrastructure | Docker Compose |

Le frontend utilise du CSS natif (pas de framework type Tailwind ou Bootstrap).

---

## 🏗️ Architecture

### Vue d'ensemble

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Navigateur  │────▶│ Vite (React) │────▶│ Laravel API  │────▶│  PostgreSQL  │
│   :5179     │     │    :5173     │     │    :8000     │     │    :5432     │
└─────────────┘     └──────────────┘     └──────┬───────┘     └──────────────┘
                                                 │
                                          Python subprocess
                                                 │
                                         ┌───────▼───────┐
                                         │ Serveur VTOM  │
                                         │  (SSH/SFTP)   │
                                         └───────────────┘
```

Le frontend Vite proxy les appels `/api/*` vers le backend Laravel. Le backend exécute les scripts Python en subprocess pour récupérer les données VTOM via SSH/SFTP, les convertit en JSON et les met en cache 5 minutes dans PostgreSQL.

### Architecture React

```
App (BrowserRouter)
  └─ PlanDataProvider (données statiques du plan)
      └─ ThemeProvider (thème clair/sombre)
          └─ AppLayout (routes + layout persistant)
              ├─ Hero (bandeau de navigation)
              ├─ Routes
              │   ├─ Home (/)
              │   ├─ Documentation (/documentation)
              │   └─ VtomPlan (/vtom-plan)
              ├─ AdvancedSearchModal
              ├─ CookieConsent
              └─ Footer
```

### Flux des données VTOM

```
fetch_vtom.py ──SSH/SFTP──▶ XML VTOM
     │
     └──▶ xmltodict ──▶ JSON ──▶ Laravel cache (PostgreSQL, 5 min)
                                       │
                                       └──▶ GET /api/vtom/tours ──▶ useVtomData ──▶ VtomPlan
```

### Flux des scripts

```
Clic « Charger le Script »
     │
     └──▶ GET /api/vtom/script?script_path=...
              │
              └──▶ fetch_scripts.py ──Jump host──▶ Serveur cible ──SFTP──▶ contenu
                         │
                         └──▶ JSON ──▶ ScriptModal (coloration syntaxique bash)
```

---

## 🚀 Installation et démarrage

### Prérequis

- Docker & Docker Compose
- Accès réseau SSH au serveur VTOM (et au jump host le cas échéant)
- Node.js 20+ et PHP 8.2+ (uniquement pour le développement local hors Docker)

### Avec Docker (recommandé)

```bash
# 1. Cloner
git clone <repository-url>
cd pain-main

# 2. Configurer
cp back/.env.example back/.env
# Éditer back/.env (voir section Configuration)

# 3. Construire et lancer
docker compose build
docker compose up -d

# 4. Vérifier
docker compose ps
curl http://localhost:8009/api/health
```

Au premier lancement, le conteneur backend :
- Installe Composer (dépendances PHP) et les packages Python (`paramiko`, `xmltodict`)
- Génère la clé applicative Laravel si absente
- Exécute les migrations PostgreSQL en arrière-plan
- Démarre `php artisan serve` sur le port 8000 (exposé en 8009)

### Développement local sans Docker

**Backend :**
```bash
cd back
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve --port=8000
```

**Frontend :**
```bash
cd front
npm install
npm run dev   # http://localhost:5173
```

**Scripts Python :**
```bash
pip install -r scripts/requirements.txt
```

### Commandes Docker utiles

```bash
docker compose up -d                  # démarrer
docker compose logs -f                # suivre les logs
docker compose build --no-cache       # reconstruire depuis zéro
docker compose down                   # arrêter
docker compose down -v                # arrêter et supprimer les volumes
```

---

## ⚙️ Configuration

### Variables d'environnement backend (`back/.env`)

**Base de données** (pré-configurée pour Docker) :

```env
DB_CONNECTION=pgsql
DB_HOST=pain-db
DB_PORT=5432
DB_DATABASE=pain
DB_USERNAME=pain
DB_PASSWORD=pain
```

**Accès SSH au serveur VTOM** (obligatoires — récupération du plan) :

```env
VTOM_SSH_HOST=
VTOM_SSH_PORT=22
VTOM_SSH_USERNAME=
VTOM_SSH_PASSWORD=
VTOM_SSH_FILE_PATH=
```

**Accès SSH jump host** (obligatoires — récupération des scripts) :

```env
JUMP_HOST=
JUMP_PORT=22
JUMP_USERNAME=
JUMP_PASSWORD=
TARGET_HOST=
TARGET_PORT=22
TARGET_USERNAME=
TARGET_PASSWORD=
```

### Proxy frontend

Le proxy API du serveur de dev Vite est configurable via `VITE_API_PROXY` (défaut : `http://10.37.44.221:8009`). Voir `front/vite.config.js`.

---

## 📂 Structure du projet

```
pain-main/
├── docker-compose.yml          # Orchestration des 3 services
├── README.md                   # Ce fichier
├── tours.xml / tours.json      # Exemples de données VTOM
│
├── back/                       # API Laravel 12
│   ├── Dockerfile
│   ├── docker-entrypoint.sh    # Migrations auto + démarrage serveur
│   ├── composer.json
│   ├── requirements.txt        # Dépendances Python (paramiko, xmltodict)
│   ├── .env.example
│   ├── app/
│   │   └── Http/
│   │       ├── Controllers/
│   │       │   └── VtomController.php   # Contrôleur principal
│   │       └── Middleware/              # CORS, rate limiting, headers sécurité
│   └── routes/
│       └── api.php             # Définition des routes REST
│
├── front/                      # SPA React 19 + TypeScript
│   ├── Dockerfile
│   ├── vite.config.js          # Proxy /api + build config
│   ├── package.json
│   └── src/
│       ├── App.tsx             # Racine (providers + router)
│       ├── components/
│       │   ├── AppLayout.tsx       # Layout global + routing
│       │   ├── Home.tsx            # Page d'accueil
│       │   ├── Documentation.tsx   # Page documentation
│       │   ├── VtomPlan.tsx        # Composant principal du plan SVG
│       │   ├── VtomJson.tsx        # Explorateur JSON brut (debug)
│       │   ├── AdvancedSearchModal.tsx
│       │   ├── Hero.tsx / QuickAccess.tsx / Footer.tsx
│       │   ├── GhostButton.tsx / ThemeToggleButton.tsx / CookieConsent.tsx
│       │   └── vtom/              # Sous-composants du plan
│       │       ├── PlanHeader.tsx / PlanSvgCanvas.tsx / PlanMinimap.tsx
│       │       ├── AppTooltip.tsx / ChaineBatchPanel.tsx / SousProgrammesModal.tsx
│       │       ├── ParameterDisplay.tsx
│       │       └── modals/        # AppDetailModal, JobDetailModal, ScriptModal,
│       │                          # AppSearchModal, JobSearchModal
│       ├── contexts/
│       │   ├── PlanDataProvider.tsx   # Données statiques du plan
│       │   └── ThemeProvider.tsx      # Thème clair/sombre
│       ├── hooks/
│       │   ├── useVtomData.ts        # Fetch /api/vtom/tours
│       │   ├── usePlanData.ts        # Données statiques pré-chargées
│       │   └── useCookie.ts
│       ├── types/
│       │   └── vtom.ts              # Types TS (Job, ApplicationNode, etc.)
│       ├── utils/
│       │   ├── vtomParser.ts        # Extraction des entités depuis le JSON
│       │   ├── vtomHelpers.ts       # Utilitaires (ressources, couleurs)
│       │   ├── vtomColors.ts        # Icônes statut + adoucissement couleurs
│       │   ├── bashHighlighter.tsx  # Coloration syntaxique bash
│       │   └── cookies.ts
│       └── data/                    # Données statiques embarquées
│           ├── plan-data.json
│           ├── tours.json           # Données VTOM de fallback
│           ├── liste_prog.json      # Référentiel sous-programmes
│           └── documentation_*.json
│
└── scripts/                    # Scripts Python d'extraction
    ├── fetch_vtom.py           # SSH/SFTP → XML → JSON
    ├── fetch_scripts.py        # Jump host → lecture scripts shell
    └── requirements.txt
```

---

## 🔌 API Backend

Tous les endpoints sont définis dans `back/routes/api.php` et gérés par `VtomController`.
**Base URL :** `http://localhost:8009/api`

### Vue d'ensemble des routes

| Méthode | Endpoint | Contrôleur | Description |
|---------|----------|------------|-------------|
| `GET` | `/health` | Closure | Health check général |
| `GET` | `/vtom/health` | `VtomController@healthCheck` | Santé du module VTOM |
| `GET` | `/vtom/tours` | `VtomController@getTours` | Récupération du plan (avec cache) |
| `POST` | `/vtom/tours/refresh` | `VtomController@refreshTours` | Force le rafraîchissement |
| `GET` | `/vtom/tours/cache` | `VtomController@getCacheInfo` | État du cache |
| `GET` | `/vtom/script` | `VtomController@getScript` | Contenu d'un script distant |
| `GET` | `/vtom/scripts/chaine-batch` | `VtomController@getAllChaineBatch` | Scan bulk des CHAINE_BATCH |

### `GET /api/health`

Health check simple, sans dépendance externe.

```json
{
  "status": "ok",
  "timestamp": "2026-04-16T10:30:00+00:00",
  "service": "Pain API"
}
```

### `GET /api/vtom/tours`

Endpoint principal. Récupère le plan VTOM converti en JSON.

**Fonctionnement interne :**
1. Si `?force_refresh=true` → vide le cache
2. Cherche la clé `vtom_tours_data` dans le cache Laravel (TTL 300 s, stockage PostgreSQL)
3. Si vide, lance `fetch_vtom.py` en subprocess
4. Le script se connecte en SSH/SFTP au serveur VTOM, télécharge le XML, le convertit en JSON via `xmltodict`
5. Le JSON est mis en cache et retourné

**Paramètres query :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| `force_refresh` | boolean | Si `true`, ignore le cache |

**Réponse 200 :**
```json
{
  "data": { "Domain": { "Environments": { "Environment": { ... } } } },
  "cached": true,
  "timestamp": "2026-04-16T10:30:00+00:00"
}
```

**Réponse 500 :** `{ "error": "Échec d'authentification SSH pour user@host" }`

### `POST /api/vtom/tours/refresh`

Invalide le cache puis appelle `getTours()`. Réponse identique à `GET /vtom/tours`.

### `GET /api/vtom/tours/cache`

Informations sur l'état du cache sans déclencher de récupération.

```json
{
  "cached": true,
  "cache_duration": 300,
  "cache_key": "vtom_tours_data"
}
```

### `GET /api/vtom/health`

Vérifie que `fetch_vtom.py` existe et que les variables SSH sont configurées.

- **200 :** `{ "status": "healthy", "cache_duration": 300 }`
- **503 :** `{ "status": "unhealthy", "missing": ["VTOM_SSH_HOST", ...] }`

### `GET /api/vtom/script`

Récupère le contenu d'un script shell via le jump host (double-hop SSH).

**Paramètres query :**

| Paramètre | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `script_path` | string | oui | Chemin du script (ex. `foo.sh`, `/app/bar.sh`, `#/app/baz.sh`) |

**Fonctionnement :**
1. Vérifie `script_path` et les 8 variables SSH (jump + target)
2. Si le cache VTOM est vide, appelle `getTours()` (nécessaire pour résoudre les chemins relatifs)
3. Lance `fetch_scripts.py` avec `FETCH_SINGLE_SCRIPT` et le JSON VTOM sur stdin
4. Retourne le contenu et les éventuelles valeurs `CHAINE_BATCH` extraites

**Réponse 200 :**
```json
{
  "path": "/app/pay/scripts/batchslr/foo.sh",
  "content": "#!/bin/bash\nCHAINE_BATCH=foo,bar\n...",
  "chaine_batch": ["foo", "bar"]
}
```

**Codes d'erreur :** 422 (paramètre manquant), 500 (SSH/variables), 404 (script absent de la réponse).

### `GET /api/vtom/scripts/chaine-batch`

Scan bulk de tous les scripts du plan. Résultat mis en cache (clé `vtom_chaine_batch_all`, TTL 300 s).

**Réponse 200 :**
```json
{
  "chaine_batch": { "/app/foo.sh": ["BATCH1", "BATCH2"], ... },
  "errors": {},
  "skipped": [],
  "scripts_dir": "/app/pay/scripts/batchslr/",
  "total_fetched": 247
}
```

### Système de cache

| Paramètre | Valeur |
|-----------|--------|
| Driver | `database` (table `cache` dans PostgreSQL) |
| Clés | `vtom_tours_data`, `vtom_chaine_batch_all` |
| Durée | 300 secondes (5 min) |
| Invalidation manuelle | `POST /vtom/tours/refresh` ou `?force_refresh=true` |

---

## 🐍 Scripts Python

Les scripts sont dans `scripts/` et exécutés par Laravel via `Symfony\Component\Process\Process`. Ils ne sont **jamais appelés directement par le frontend**.

### `fetch_vtom.py` — Récupération du plan

```
VtomController (PHP)
  │
  ├─ Process(['python3', 'scripts/fetch_vtom.py'])
  │    env: VTOM_SSH_HOST, VTOM_SSH_PORT, VTOM_SSH_USERNAME,
  │         VTOM_SSH_PASSWORD, VTOM_SSH_FILE_PATH
  │    timeout: 60s
  │
  ▼
fetch_vtom.py
  ├─ 1. Lit les variables d'environnement
  ├─ 2. Connexion SSH via paramiko (AutoAddPolicy)
  ├─ 3. Ouvre un canal SFTP
  ├─ 4. Télécharge PAY_TOURS.xml en mémoire
  ├─ 5. Convertit XML → dict via xmltodict.parse()
  └─ 6. Écrit le JSON sur stdout
         (erreur → JSON sur stderr + exit 1)
```

**Dépendances :** `paramiko` (SSH/SFTP), `xmltodict` (conversion XML).

### `fetch_scripts.py` — Récupération de scripts shell

Double-hop SSH (jump host → serveur cible) pour contourner les restrictions réseau.

```
VtomController (PHP)
  │
  ├─ Process(['python3', 'scripts/fetch_scripts.py'])
  │    env: JUMP_HOST/PORT/USERNAME/PASSWORD,
  │         TARGET_HOST/PORT/USERNAME/PASSWORD,
  │         FETCH_SINGLE_SCRIPT=/app/foo.sh  (optionnel - sinon mode bulk)
  │    stdin: JSON VTOM (depuis le cache Laravel)
  │    timeout: 30s (unique) / 120s (bulk)
  │
  ▼
fetch_scripts.py
  ├─ 1. Lit les 8 variables d'environnement SSH
  ├─ 2. Lit le JSON VTOM depuis stdin
  ├─ 3. Extrait scriptsDir et la liste des scripts
  ├─ 4. Résout les chemins (règles ci-dessous)
  ├─ 5. Double-hop SSH :
  │      Jump (paramiko) → open_channel('direct-tcpip') → Target
  ├─ 6. Ouvre SFTP sur le serveur cible
  ├─ 7. Pour chaque script : lit le fichier, extrait CHAINE_BATCH
  └─ 8. Retourne un JSON agrégé
```

**Règles de résolution des chemins :**

| Chemin fourni | Transformation | Résultat |
|---------------|----------------|----------|
| `#/app/foo.sh` | Retire le `#` | `/app/foo.sh` |
| `/app/foo.sh` | Chemin absolu, inchangé | `/app/foo.sh` |
| `foo.sh` | Préfixe avec `scriptsDir` | `<scriptsDir>/foo.sh` |

**Extraction CHAINE_BATCH :**
Détection via regex `^CHAINE_BATCH=([^\n]+)` (ligne commençant par la variable, commentaires et occurrences en milieu de ligne ignorés). Les valeurs sont séparées par des virgules.

**Sortie JSON :**
```json
{
  "scriptsDir": "/app/pay/scripts/batchslr/",
  "fetched": { "<chemin>": "<contenu>", ... },
  "errors":  { "<chemin>": "<message>", ... },
  "skipped": ["<chemin_non_résolu>", ...],
  "chaine_batch": { "<chemin>": ["BATCH1", "BATCH2"], ... }
}
```

### Tester les scripts manuellement

```bash
# fetch_vtom.py
VTOM_SSH_HOST=... VTOM_SSH_PORT=22 VTOM_SSH_USERNAME=... \
  VTOM_SSH_PASSWORD=... VTOM_SSH_FILE_PATH=... \
  python3 scripts/fetch_vtom.py

# fetch_scripts.py (script unique)
echo '{"Domain":...}' | JUMP_HOST=... TARGET_HOST=... \
  FETCH_SINGLE_SCRIPT=/app/foo.sh \
  python3 scripts/fetch_scripts.py
```

---

## 🎨 Frontend

### Routes

| Route | Composant | Description |
|-------|-----------|-------------|
| `/` | `Home` | Accueil avec accès rapides |
| `/vtom-plan` | `VtomPlan` | Plan SVG interactif (page principale) |
| `/documentation` | `Documentation` | Guides utilisateur et développeur |
| `*` | — | Redirection vers `/` |

### Hooks personnalisés

**`useVtomData`** — Récupère le plan depuis l'API
```typescript
const { data, loading, error, lastUpdate, cached, refresh } = useVtomData()
```

**`usePlanData`** — Données statiques pré-chargées (accueil, documentation, accès rapide)
```typescript
const { planData, planApplications, getAppDetail } = usePlanData()
```

**`useTheme`** — Gestion du thème
```typescript
const { theme, toggleTheme } = useTheme()
```

**`useCookie`** — Lecture/écriture de cookies avec expiration.

### Structure des données VTOM

Les données issues du parsing XML exposent les entités suivantes (voir `front/src/types/vtom.ts`) :

- `ApplicationNode` — application positionnée sur le plan (x, y, width, background, family, status, cycle, jobs, graphComments…)
- `Job` — traitement d'une application (name, status, script, parameters, frequency, mode, minStart, maxStart, retcode, background, position…)
- `ApplicationLink` / `JobLink` — liens de dépendance (from, to, type)
- `TrafficLight` / `Comment` / `Column` / `Separator` — autres entités visuelles du plan
- `VtomResource` — ressource VTOM partagée (nom, type, valeur) pour la résolution des paramètres

Le parser (`utils/vtomParser.ts`) applique un facteur d'échelle X (`X_SCALE = 0.75`) pour compacter le rendu horizontal.

### Conventions de code

- **TypeScript strict**, typage explicite de toutes les props
- **Composants fonctionnels** uniquement, hooks pour la gestion d'état
- **Mémoïsation** (`useMemo`, `useCallback`) quand pertinent
- **Naming** : PascalCase pour les composants (`VtomPlan.tsx`), camelCase avec préfixe `use` pour les hooks, BEM pour les classes CSS (`plan-board__header`)
- **CSS natif** avec variables CSS pour le theming (`var(--surface-2)`, `var(--text-1)`, etc.)

### Gestion du thème

```
Cookie/localStorage
    ↓
ThemeProvider
    ↓
useTheme() hook
    ↓
document.documentElement.dataset.theme = 'dark' | 'light'
    ↓
CSS (variables personnalisées)
```

---

## 🚢 Déploiement

### Docker (recommandé)

Trois services orchestrés par `docker-compose.yml` :

| Service | Image | Port exposé |
|---------|-------|-------------|
| `pain-db` | `postgres:16` | `5432 → 5432` |
| `pain-back` | `php:8.4-cli` + Python 3 | *(interne uniquement)* |
| `pain-front` | `node:20-alpine` + Vite | *(interne uniquement)* |
| `pain-nginx` | `nginx:alpine` | `80 → 80` |

Ordre de démarrage : `pain-db` (healthcheck `pg_isready`) → `pain-back` (migrations auto) → `pain-front` (build React) → `pain-nginx`.

### Build

Le build est autonome : chaque service se construit depuis son propre `Dockerfile`,
sans image de base pré-construite ni étape manuelle.

```bash
docker compose build       # construit back (PHP + Python + Composer) et front (Vite)
docker compose up -d
```

Le `back/Dockerfile` installe les extensions PHP (PostgreSQL, LDAP), les dépendances
Python des scripts VTOM, puis `composer install`. Le `front/Dockerfile` fait
`npm install` puis `npm run build`. Un accès internet est requis au moment du build
pour télécharger les dépendances.

---

### Variables d'environnement de production

**`back/.env` :**
```env
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:...
APP_URL=https://votre-domaine
```

### Optimisations

**Frontend :**
- Build minifié via Vite (esbuild)
- Tree-shaking automatique
- Vendor chunk séparé (`react`, `react-dom`, `react-router-dom`)
- Sourcemaps désactivés en production
- Compression gzip/brotli (côté serveur web)

**Backend :**
- `composer install --optimize-autoloader --no-dev`
- `php artisan config:cache && php artisan route:cache`
- OPcache PHP activé
- Cache Laravel sur PostgreSQL (pas besoin de Redis)

### Healthchecks

```bash
curl http://localhost:8009/api/health          # backend
curl http://localhost:8009/api/vtom/health     # module VTOM (SSH config)
curl http://localhost:5179                     # frontend
docker exec pain-db pg_isready -U pain  # base
```

---

## 🔧 Maintenance et dépannage

### Tableau de dépannage

| Problème | Solution |
|----------|----------|
| Frontend ne charge pas les données | Vérifier que le backend répond (`curl :8009/api/health`) et que le proxy Vite pointe vers la bonne URL |
| `Échec d'authentification SSH` dans les logs | Vérifier `VTOM_SSH_*` dans `back/.env` |
| `Variables SSH manquantes` (script) | Vérifier les 8 variables `JUMP_*` et `TARGET_*` |
| Base de données inaccessible | `docker compose ps` → vérifier que `pain-db` est `healthy` |
| Cache ne se rafraîchit pas | `POST /api/vtom/tours/refresh` ou `?force_refresh=true` |
| Scan CHAINE_BATCH long | Normal au premier appel (SFTP sur chaque script). Résultat mis en cache 5 min. |
| Scripts Python échouent | Vérifier `paramiko` et `xmltodict` dans le conteneur (`pip list`) |
| `fetch_vtom.py introuvable` | Le volume `./scripts` doit être monté dans le conteneur backend |

### Logs

```bash
docker compose logs -f pain-back                          # backend
docker exec pain-back tail -f storage/logs/laravel.log    # Laravel
docker compose logs -f pain-front                         # frontend
docker compose logs -f pain-db                            # base
```

### Mise à jour des dépendances

**Frontend :**
```bash
cd front && npm outdated && npm update && npm audit fix
```

**Backend :**
```bash
cd back && composer outdated && composer update
```

### Nettoyage Docker

```bash
docker compose down          # arrêt simple
docker compose down -v       # + suppression des volumes
docker image prune -a        # images non utilisées
docker volume prune          # volumes orphelins
```

### Convention de commits

Format : `type(scope): message`

| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `refactor` | Refactorisation sans changement de comportement |
| `style` | Formatage |
| `test` | Ajout/modification de tests |
| `chore` | Tâches de maintenance |

Exemples :
```
feat(plan): ajout du scan bulk CHAINE_BATCH
fix(search): correction du filtrage des accents
docs(readme): mise à jour de la section API
refactor(hooks): simplification de useVtomData
```

---

## 📝 Licence

Projet développé pour un usage interne.

---

**Dernière mise à jour :** Avril 2026



sudo docker cp /home/dev/pain-main/ldap/users.ldif pain-ldap:/tmp/users.ldif
sudo docker exec pain-ldap ldapadd -x -D "cn=admin,dc=example,dc=fr" -w adminpass -f /tmp/users.ldif
