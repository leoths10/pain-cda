import {
  KeyboardEvent as ReactKeyboardEvent,
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { PlanApplicationsEntry } from '../types'
import { useVtomSearchData } from '../contexts'

interface AdvancedSearchModalProps {
  applications: readonly PlanApplicationsEntry[]
  isOpen: boolean
  onClose: () => void
}

type ResultKind = 'app' | 'job'

interface SearchResult {
  kind: ResultKind
  key: string
  primary: string
  secondary: string
}

function AdvancedSearchModal({ applications, isOpen, onClose }: AdvancedSearchModalProps) {
  const [query, setQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()
  const { searchableApps, searchableJobs, vtomLoading } = useVtomSearchData()

  useEffect(() => {
    if (!isOpen) return
    setQuery('')
    setFocusedIndex(0)
    const timeoutId = window.setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(timeoutId)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const appSource: { label: string; secondary: string }[] = searchableApps.length > 0
    ? searchableApps.map(a => ({ label: a.name, secondary: a.family }))
    : applications.map(a => ({ label: a.label, secondary: a.column }))

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase()

    const appResults: SearchResult[] = (
      q ? appSource.filter(a => a.label.toLowerCase().includes(q)) : appSource
    ).map(a => ({ kind: 'app', key: `app:${a.label}`, primary: a.label, secondary: a.secondary }))

    const jobResults: SearchResult[] = q
      ? searchableJobs
          .filter(j => j.name.toLowerCase().includes(q) || j.parentApp.toLowerCase().includes(q))
          .map(j => ({ kind: 'job', key: `job:${j.parentApp}:${j.name}`, primary: j.name, secondary: j.parentApp }))
      : []

    return [...appResults, ...jobResults]
  }, [appSource, searchableJobs, query])

  useEffect(() => { setFocusedIndex(0) }, [results])

  const handleSelect = useCallback((result: SearchResult) => {
    onClose()
    if (result.kind === 'app') {
      navigate('/vtom-plan', { state: { highlightApp: result.primary } })
    } else {
      navigate('/vtom-plan', { state: { highlightApp: result.secondary, openJob: result.primary } })
    }
  }, [onClose, navigate])

  const handleKeyDown = useCallback((e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      handleSelect(results[focusedIndex])
    }
  }, [results, focusedIndex, handleSelect])

  if (!isOpen) return null

  const appResults = results.filter(r => r.kind === 'app')
  const jobResults = results.filter(r => r.kind === 'job')

  let globalIndex = -1

  return (
    <div className="search-modal__overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-modal__header">
          <div>
            <p className="search-modal__eyebrow">Recherche avancée</p>
            <h3>Plan VTOM</h3>
          </div>
          <button type="button" className="plan-modal__close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="search-modal__input">
          <span role="img" aria-hidden="true">🔎</span>
          <input
            ref={inputRef}
            type="search"
            placeholder="Application ou traitement..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {vtomLoading && <span className="search-modal__loading">⏳</span>}
        </div>

        <div className="search-modal__results">
          {results.length === 0 && <p className="search-modal__empty">Aucun résultat</p>}

          {appResults.length > 0 && (
            <div className="search-modal__group">
              <p className="search-modal__group-label">Applications ({appResults.length})</p>
              {appResults.map(r => {
                globalIndex++
                const idx = globalIndex
                return (
                  <button
                    key={r.key}
                    type="button"
                    className={`search-result${focusedIndex === idx ? ' search-result--focused' : ''}`}
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                  >
                    <span className="search-result__icon">🗂️</span>
                    <span className="search-result__title">{r.primary}</span>
                    <span className="search-result__meta">{r.secondary}</span>
                  </button>
                )
              })}
            </div>
          )}

          {jobResults.length > 0 && (
            <div className="search-modal__group">
              <p className="search-modal__group-label">Traitements ({jobResults.length})</p>
              {jobResults.map(r => {
                globalIndex++
                const idx = globalIndex
                return (
                  <button
                    key={r.key}
                    type="button"
                    className={`search-result${focusedIndex === idx ? ' search-result--focused' : ''}`}
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                  >
                    <span className="search-result__icon">⚙️</span>
                    <span className="search-result__title">{r.primary}</span>
                    <span className="search-result__meta">{r.secondary}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdvancedSearchModal