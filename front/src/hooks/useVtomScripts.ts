import { useCallback, useMemo, useState } from 'react'
import type { ApplicationNode, Job } from '../types/vtom'
import { apiFetch } from '../utils/apiFetch'

export interface ChaineBatchEntry {
  job: Job
  appName: string
  values: string[]
}

/**
 * Miroir client de `resolve_script_path()` dans scripts/fetch_scripts.py.
 * Gardé synchronisé manuellement : utilisé uniquement pour le lookup du cache
 * `getCachedChaineBatch` qui doit matcher la clé telle qu'écrite côté Python.
 *
 *   '#/foo.sh' → '/foo.sh'
 *   '/foo.sh'  → '/foo.sh'
 *   'foo.sh'   → '<scriptsDir>/foo.sh'
 */
function resolveScriptPath(raw: string, dir: string): string | null {
  const s = raw.trim()
  if (!s) return null
  if (s.startsWith('#')) return s.slice(1).trim() || null
  if (s.startsWith('/')) return s
  const base = dir.replace(/\/$/, '')
  return base ? `${base}/${s}` : null
}

/**
 * Gère le chargement des scripts shell et le cache des variables CHAINE_BATCH.
 *
 * Deux sources alimentent `scriptCache` :
 * - scan bulk au chargement du plan (GET /api/vtom/scripts/chaine-batch)
 * - fetch unique à l'ouverture d'un traitement (GET /api/vtom/script)
 *
 * Les clés du cache sont les chemins **résolus** (absolus). Le lookup accepte
 * un chemin brut grâce à `resolveScriptPath`.
 */
export function useVtomScripts(applications: ApplicationNode[]) {
  const [scriptContent, setScriptContent] = useState<string | null>(null)
  const [scriptLoading, setScriptLoading] = useState(false)
  const [scriptError, setScriptError] = useState<string | null>(null)
  const [chaineBatch, setChaineBatch] = useState<string[] | null>(null)

  const [scriptCache, setScriptCache] = useState<Map<string, string[]>>(new Map())
  const [scriptsDir, setScriptsDir] = useState<string>('')

  const [chaineBatchLoading, setChaineBatchLoading] = useState(false)
  const [chaineBatchError, setChaineBatchError] = useState<string | null>(null)

  const loadAllChaineBatch = useCallback(async () => {
    setChaineBatchLoading(true)
    setChaineBatchError(null)
    try {
      const res = await apiFetch('/api/vtom/scripts/chaine-batch')
      const json = await res.json()
      if (!res.ok) {
        setChaineBatchError(json.error || `Erreur ${res.status}`)
        return
      }
      if (json.scripts_dir) setScriptsDir(json.scripts_dir)
      const bulk: Record<string, string[]> = json.chaine_batch ?? {}
      if (Object.keys(bulk).length > 0) {
        setScriptCache(new Map(Object.entries(bulk)))
      }
    } catch (err) {
      setChaineBatchError(err instanceof Error ? err.message : 'Erreur réseau')
    } finally {
      setChaineBatchLoading(false)
    }
  }, [])

  const loadScript = useCallback(async (scriptPath: string): Promise<string | null> => {
    setScriptLoading(true)
    setScriptError(null)
    try {
      const res = await apiFetch(`/api/vtom/script?script_path=${encodeURIComponent(scriptPath)}`)
      const json = await res.json()
      if (!res.ok) {
        setScriptError(json.message || json.error || `Erreur ${res.status}`)
        return null
      }
      setScriptContent(json.content)
      const values: string[] | null = json.chaine_batch ?? null
      setChaineBatch(values && values.length > 0 ? values : null)
      if (values && values.length > 0) {
        setScriptCache(prev => new Map(prev).set(scriptPath, values))
      }
      return json.content
    } catch (err) {
      setScriptError(err instanceof Error ? err.message : 'Erreur réseau')
      return null
    } finally {
      setScriptLoading(false)
    }
  }, [])

  const resetScriptState = useCallback(() => {
    setScriptContent(null)
    setScriptError(null)
    setChaineBatch(null)
  }, [])

  const getCachedChaineBatch = useCallback((scriptPath: string): string[] | null => {
    if (scriptCache.has(scriptPath)) return scriptCache.get(scriptPath)!
    const resolved = resolveScriptPath(scriptPath, scriptsDir)
    if (resolved && scriptCache.has(resolved)) return scriptCache.get(resolved)!
    return null
  }, [scriptCache, scriptsDir])

  const chaineBatchEntries = useMemo<ChaineBatchEntry[]>(() => {
    const entries: ChaineBatchEntry[] = []
    for (const app of applications) {
      for (const job of app.jobs ?? []) {
        if (!job.script) continue
        const values = getCachedChaineBatch(job.script)
        if (values) entries.push({ job, appName: app.name, values })
      }
    }
    return entries
  }, [applications, getCachedChaineBatch])

  return {
    scriptContent, scriptLoading, scriptError, chaineBatch,
    chaineBatchEntries, chaineBatchLoading, chaineBatchError,
    loadScript, loadAllChaineBatch, resetScriptState,
    getCachedChaineBatch,
  }
}
