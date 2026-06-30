import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../utils/apiFetch'

interface UseVtomDataReturn {
  data: any
  loading: boolean
  error: string | null
  lastUpdate: string | null
  cached: boolean
  refresh: () => Promise<void>
}

/**
 * Récupère les données VTOM depuis /api/vtom/tours, avec gestion du cache
 * côté backend et possibilité de forcer le rafraîchissement.
 */
export function useVtomData(): UseVtomDataReturn {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const [cached, setCached] = useState(false)

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const url = forceRefresh ? '/api/vtom/tours?force_refresh=true' : '/api/vtom/tours'
      const response = await apiFetch(url)
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`)

      const result = await response.json()
      setData(result.data)
      setLastUpdate(result.timestamp)
      setCached(result.cached)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => fetchData(true), [fetchData])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, lastUpdate, cached, refresh }
}
