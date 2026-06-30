# Authentification & Tokens — PAIN

> Documentation technique de l'implémentation en place (mai 2026).

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Les deux tokens](#2-les-deux-tokens)
3. [Flux login](#3-flux-login)
4. [Flux refresh (restauration de session)](#4-flux-refresh-restauration-de-session)
5. [Flux des requêtes API](#5-flux-des-requêtes-api)
6. [Flux logout](#6-flux-logout)
7. [Sécurité](#7-sécurité)
8. [Configuration](#8-configuration)
9. [Tableau des routes](#9-tableau-des-routes)

---

## 1. Vue d'ensemble

L'authentification repose sur deux couches :

**Couche 1 — Vérification des identifiants : LDAP**
Les credentials (identifiant + mot de passe) sont vérifiés contre le serveur LDAP via `directorytree/ldaprecord-laravel`. Laravel ne stocke jamais le mot de passe. La table `users` en PostgreSQL est un cache des attributs LDAP (uid, name, email, groups), mis à jour à chaque login réussi.

**Couche 2 — Maintien de session : Sanctum + Redis**
Après validation LDAP, le backend émet deux tokens :
- un **access token** (court, en mémoire côté client)
- un **refresh token** (long, en cookie httpOnly)

---

## 2. Les deux tokens

### Access token (Sanctum)

| Propriété | Valeur |
|-----------|--------|
| Type | Personal Access Token Sanctum |
| Durée de vie | **1 heure** |
| Stockage backend | Table PostgreSQL `personal_access_tokens` (hash SHA-256) |
| Stockage frontend | **Mémoire React uniquement** (`useState` dans `AuthContext`) |
| Transport | Header HTTP `Authorization: Bearer <token>` |
| Format | `<id>\|<40 octets hex>` ex: `3\|a1b2c3...` |

L'access token n'est **jamais** écrit dans `localStorage` ni dans un cookie. Il vit uniquement en mémoire React. Un rechargement de page l'efface — c'est le refresh token qui restitue la session.

### Refresh token

| Propriété | Valeur |
|-----------|--------|
| Durée de vie | **30 jours** |
| Stockage backend | Redis, clé `refresh:<hash_sha256>` → `user_id` |
| Stockage frontend | Cookie `refresh_token` — httpOnly, SameSite=Strict |
| Transport | Cookie HTTP automatique (navigateur) |
| Path du cookie | `/api/auth/refresh` uniquement |
| Rotation | Oui — nouveau token émis à chaque refresh |

Le cookie est restreint au path `/api/auth/refresh`, donc le navigateur ne l'envoie qu'à cet endpoint précis. Il n'est jamais visible depuis JavaScript (`httpOnly`).

---

## 3. Flux login

```
[Navigateur] POST /api/auth/login
             { identifiant: "dev", mot_de_passe: "dev" }
                    │
                    ▼
[AuthController::login()]
  1. Validation Laravel (422 si champs manquants)
  2. Bind LDAP avec le compte de service (LDAP_USERNAME/PASSWORD)
  3. Recherche uid="dev" dans l'annuaire → récupère dn, cn, mail, memberOf
  4. Re-bind avec le DN de l'utilisateur + son mot de passe
     → BindException si mot de passe incorrect → HTTP 401
  5. User::updateOrCreate(['uid' => 'dev'], [...]) → sync PostgreSQL
  6. Révoque tous les tokens Sanctum existants de cet utilisateur
  7. Émet un access token Sanctum (1h)
  8. Génère un refresh token aléatoire (64 chars)
     → hash SHA-256 → Redis::setex("refresh:<hash>", 30j, user_id)
                    │
                    ▼
[Réponse HTTP 200]
  Body JSON  : { token: "3|a1b2c3...", user: { uid, name, email, groups } }
  Cookie Set : refresh_token=<valeur brute>; HttpOnly; SameSite=Strict;
               Path=/api/auth/refresh; Max-Age=2592000
                    │
                    ▼
[AuthContext.login()]
  setAccessToken("3|a1b2c3...")   ← module apiFetch.ts
  setToken("3|a1b2c3...")         ← état React
  setUser({ uid, name, ... })     ← état React
  → isAuthenticated devient true → redirect vers /
```

---

## 4. Flux refresh (restauration de session)

Déclenché automatiquement au montage de `AuthProvider` (rechargement de page, nouvel onglet).

```
[AuthProvider monte]
  POST /api/auth/refresh   (credentials: 'include' → envoie le cookie httpOnly)
         │
         ▼
[AuthController::refresh()]
  1. Lit le cookie refresh_token → absent → HTTP 401 "Refresh token manquant"
  2. Hash SHA-256 du refresh token → Redis::get("refresh:<hash>") → user_id
     → absent/expiré → HTTP 401 "Session expirée" + suppression du cookie
  3. User::find(user_id) → introuvable → HTTP 401 + nettoyage Redis
  4. Rotation :
     - Redis::del("refresh:<ancien_hash>")
     - $user->tokens()->delete()   ← révoque l'ancien access token
     - Émet un nouvel access token Sanctum (1h)
     - Génère un nouveau refresh token → Redis (30j)
         │
         ▼
[Réponse HTTP 200]
  Body JSON  : { token: "4|d4e5f6...", user: { uid, name, email, groups } }
  Cookie Set : nouveau refresh_token (rotation)
         │
         ▼
[AuthContext (useEffect)]
  Cas succès :
    setAccessToken(data.token) + setToken + setUser → session restaurée
  Cas échec (401) :
    clearSession() → token null, user null → redirect /login
  Dans tous les cas :
    setIsLoading(false) → ProtectedRoute peut afficher la page ou rediriger
```

---

## 5. Flux des requêtes API

Toute requête vers `/api/vtom/*` passe par `apiFetch` ([front/src/utils/apiFetch.ts](front/src/utils/apiFetch.ts)).

```
apiFetch('/api/vtom/tours')
  ├─ Ajoute Accept: application/json
  ├─ Ajoute Authorization: Bearer <access_token en mémoire>
  └─ fetch(...)
          │
          ▼
     HTTP 200 → retourne la réponse normalement
          │
     HTTP 401 (token expiré après 1h) :
          ├─ POST /api/auth/refresh  (avec cookie httpOnly)
          │      │
          │   Succès → setAccessToken(nouveau_token)
          │           → rejoue la requête originale avec le nouveau token
          │
          └─ Échec → setAccessToken(null) + _onAuthFailure()
                     → AuthContext.clearSession() → redirect /login
```

Le retry automatique sur 401 est transparent pour les composants. Un token expiré est renouvelé silencieusement, sans que l'utilisateur voie quoi que ce soit.

---

## 6. Flux logout

```
[AuthContext.logout()]
  ├─ POST /api/auth/logout  Authorization: Bearer <token>   (fire-and-forget)
  │      └─ AuthController::logout()
  │           ├─ $request->user()->currentAccessToken()->delete()  ← Sanctum
  │           └─ Redis::del("refresh:<hash_du_cookie>")
  │           └─ withoutCookie('refresh_token', '/api/auth/refresh')
  │
  └─ clearSession() (immédiat, sans attendre la réponse réseau)
       ├─ setToken(null)
       ├─ setUser(null)
       └─ setAccessToken(null)   ← module apiFetch
            │
            ▼
       isAuthenticated = false → ProtectedRoute → redirect /login
```

Le logout côté client est immédiat même si l'appel API échoue (réseau coupé). Le token côté serveur est révoqué dès que la requête arrive.

---

## 7. Sécurité

### Pourquoi l'access token n'est pas dans localStorage

`localStorage` est accessible depuis n'importe quel script JavaScript de la page. Une faille XSS pourrait voler le token. En mémoire React, le token est inaccessible depuis l'extérieur de l'application.

Contrepartie : un rechargement de page efface l'access token. Le refresh token (cookie httpOnly) prend le relais.

### Pourquoi le refresh token est httpOnly + SameSite=Strict

- **httpOnly** : inaccessible depuis `document.cookie` en JavaScript. Protège contre le vol par XSS.
- **SameSite=Strict** : le cookie n'est envoyé que si la requête vient du même site. Protège contre les attaques CSRF.
- **Path=/api/auth/refresh** : le navigateur n'envoie le cookie qu'à cet endpoint, jamais ailleurs.

### Rotation du refresh token

À chaque appel à `/api/auth/refresh`, l'ancien refresh token est supprimé de Redis et un nouveau est émis. Si un refresh token volé est utilisé après la rotation légitime, il sera déjà invalide.

### Révocation immédiate

Sanctum stocke les tokens en base (pas de JWT). La révocation (`delete()`) est instantanée — le token est invalide dès la prochaine requête, sans délai d'expiration à attendre.

### Pas de password en base

La table `users` ne contient pas de colonne `password`. L'authentification est entièrement déléguée au LDAP. La base PostgreSQL ne peut pas être utilisée pour se connecter sans le serveur LDAP.

---

## 8. Configuration

Variables dans `back/.env` :

```env
# ── LDAP ─────────────────────────────────────────────────────────────────────
LDAP_HOST=pain-ldap          # hostname ou IP du serveur LDAP
LDAP_PORT=389                # 389 = standard, 636 = LDAPS
LDAP_BASE_DN=dc=example,dc=fr
LDAP_USERNAME=cn=admin,dc=example,dc=fr   # compte de service (lecture seule)
LDAP_PASSWORD=adminpass
LDAP_SSL=false
LDAP_TLS=false

# ── Redis (refresh tokens) ───────────────────────────────────────────────────
REDIS_CLIENT=predis
REDIS_HOST=pain-redis
REDIS_PORT=6379
REDIS_PASSWORD=null

# ── Cookies ──────────────────────────────────────────────────────────────────
COOKIE_SECURE=false          # passer à true en production (HTTPS obligatoire)
```

> En production, `COOKIE_SECURE=true` est **obligatoire** pour que le cookie refresh_token ne soit envoyé que sur HTTPS. Sans ça, le cookie peut transiter en clair.

---

## 9. Tableau des routes

| Méthode | Route | Auth | Description |
|---------|-------|:----:|-------------|
| GET | `/api/health` | Non | Health check Docker |
| POST | `/api/auth/login` | Non | Login LDAP → access token + cookie refresh |
| POST | `/api/auth/refresh` | Cookie | Rotation du refresh token → nouvel access token |
| POST | `/api/auth/logout` | Bearer | Révocation access + refresh tokens |
| GET | `/api/auth/me` | Bearer | Infos de l'utilisateur connecté |
| GET | `/api/vtom/health` | Bearer | Vérification config SSH VTOM |
| GET | `/api/vtom/tours` | Bearer | Plan VTOM (avec cache 5min) |
| POST | `/api/vtom/tours/refresh` | Bearer | Force le rechargement du plan |
| GET | `/api/vtom/tours/cache` | Bearer | État du cache |
| GET | `/api/vtom/script` | Bearer | Contenu d'un script shell (SSH) |
| GET | `/api/vtom/scripts/chaine-batch` | Bearer | Scan bulk CHAINE_BATCH |
| GET | `/api/vtom/migrado-xml` | Bearer | Export XML Migrado |

---

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| [back/app/Http/Controllers/AuthController.php](back/app/Http/Controllers/AuthController.php) | Login, refresh, logout, bind LDAP |
| [back/app/Models/User.php](back/app/Models/User.php) | Modèle utilisateur (sans password) |
| [back/config/ldap.php](back/config/ldap.php) | Config connexion LDAP |
| [front/src/contexts/AuthContext.tsx](front/src/contexts/AuthContext.tsx) | État de session React, login/logout |
| [front/src/utils/apiFetch.ts](front/src/utils/apiFetch.ts) | Wrapper fetch avec Bearer token + retry 401 |
| [front/src/components/ProtectedRoute.tsx](front/src/components/ProtectedRoute.tsx) | Guard de route (redirect /login si non connecté) |
| [front/src/components/Login.tsx](front/src/components/Login.tsx) | Formulaire de connexion |
