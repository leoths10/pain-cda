import { useEffect, useState } from 'react'
import { apiFetch } from '../utils/apiFetch'

interface UsePaysageVersionReturn {
  version: string | null
  loading: boolean
  error: string | null
}

export function usePaysageVersion(): UsePaysageVersionReturn {
  const [version, setVersion] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/api/vtom/paysage-version')
      .then(res => res.json())
      .then(json => {
        if (json.error) setError(json.error)
        else setVersion(json.version ?? null)
      })
      .catch(err => setError(err instanceof Error ? err.message : 'Erreur réseau'))
      .finally(() => setLoading(false))
  }, [])

  return { version, loading, error }
}