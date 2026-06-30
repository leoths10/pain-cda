// Wrapper fetch central pour toutes les requêtes API authentifiées.
// Gère automatiquement le header Authorization et le retry sur token expiré.

// Token d'accès Sanctum conservé en mémoire (jamais en localStorage ni cookie).
let _token: string | null = null
// Callback déclenché quand le refresh échoue → AuthContext vide la session.
let _onAuthFailure: (() => void) | null = null

// Promesse partagée pendant qu'un refresh est en cours : toutes les requêtes
// qui se prennent un 401 en parallèle attendent le même refresh au lieu d'en
// déclencher chacune un (qui satureraient le throttle:20,1 sur /refresh).
let _inFlightRefresh: Promise<boolean> | null = null

export function setAccessToken(token: string | null): void {
  _token = token
}

export function setAuthFailureHandler(handler: () => void): void {
  _onAuthFailure = handler
}

async function makeRequest(input: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (_token) headers.set('Authorization', `Bearer ${_token}`)
  return fetch(input, { ...init, headers })
}

/** Déclenche un refresh, ou rejoint celui déjà en cours. Résout à `true` si succès. */
function refreshAccessToken(): Promise<boolean> {
  if (_inFlightRefresh) return _inFlightRefresh

  _inFlightRefresh = fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
    .then(async res => {
      if (!res.ok) return false
      const data = await res.json()
      setAccessToken(data.token)
      return true
    })
    .catch(() => false)
    .finally(() => { _inFlightRefresh = null })

  return _inFlightRefresh
}

/**
 * Envoie une requête API authentifiée.
 * Si 401 : tente un refresh silencieux via le cookie httpOnly puis rejoue la
 * requête. Les refresh concurrents sont dédupliqués via {@link refreshAccessToken}.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const res = await makeRequest(input, init)

  if (res.status !== 401 || input.includes('/api/auth/')) {
    return res
  }

  const ok = await refreshAccessToken()
  if (ok) {
    return makeRequest(input, init)
  }

  setAccessToken(null)
  _onAuthFailure?.()
  return res
}