// Contexte d'authentification : gère le token Sanctum (mémoire) et le refresh token (cookie httpOnly).
// Au montage, une requête POST /api/auth/refresh restaure la session si le cookie est présent.
// Le token d'accès n'est jamais persisté dans localStorage pour limiter l'exposition XSS.
import {
  ReactNode, createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from 'react'
import { setAccessToken, setAuthFailureHandler } from '../utils/apiFetch'

export interface AuthUser {
  uid: string
  name: string
  email: string | null
  groups: string[]
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  /** true pendant la restauration de session au chargement */
  isLoading: boolean
  login: (identifiant: string, motDePasse: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Garde-fou contre le double montage du Provider en StrictMode dev :
// le refresh de session ne doit partir qu'une seule fois par chargement de l'app.
let sessionRestoreStarted = false

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser]   = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    setToken(null)
    setUser(null)
    setAccessToken(null)
  }, [])

  // Au montage : tente de restaurer la session via le cookie httpOnly.
  // Le flag de module évite le double appel en StrictMode (dev) où le useEffect
  // de montage est délibérément exécuté deux fois.
  useEffect(() => {
    setAuthFailureHandler(clearSession)

    if (sessionRestoreStarted) return
    sessionRestoreStarted = true

    fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(res => {
        if (!res.ok) throw new Error('Session expirée')
        return res.json()
      })
      .then(data => {
        setAccessToken(data.token)
        setToken(data.token)
        setUser(data.user)
      })
      .catch(() => clearSession())
      .finally(() => setIsLoading(false))
  }, [clearSession])

  const login = useCallback(async (identifiant: string, motDePasse: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ identifiant, mot_de_passe: motDePasse }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`)

    setAccessToken(data.token)
    setToken(data.token)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {})
    }
    clearSession()
  }, [token, clearSession])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
  }), [user, token, isLoading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}