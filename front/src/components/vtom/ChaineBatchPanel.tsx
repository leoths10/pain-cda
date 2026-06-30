import { useState, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { Job } from '../../types/vtom'
import type { ChaineBatchEntry } from '../../hooks/useVtomScripts'
import { SousProgrammesModal } from './SousProgrammesModal'

// Réexport pour rétrocompatibilité
export type { ChaineBatchEntry }

interface Props {
  entries: ChaineBatchEntry[]
  isOpen: boolean
  isDark: boolean
  loading?: boolean
  error?: string | null
  onClose: () => void
  onJobClick: (job: Job, appName: string) => void
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportCSV(entries: ChaineBatchEntry[]) {
  const rows = [
    ['Traitement', 'Application', 'CHAINE_BATCH'],
    ...entries.map(e => [e.job.name, e.appName, e.values.join(' | ')]),
  ]
  const csv = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';')).join('\n')
  downloadFile('\uFEFF' + csv, 'chaine_batch.csv', 'text/csv;charset=utf-8')
}

function exportJSON(entries: ChaineBatchEntry[]) {
  const data = entries.map(e => ({
    traitement:   e.job.name,
    application:  e.appName,
    script:       e.job.script ?? null,
    chaine_batch: e.values,
  }))
  downloadFile(JSON.stringify(data, null, 2), 'chaine_batch.json', 'application/json')
}

export function ChaineBatchPanel({ entries, isOpen, isDark: _isDark, loading, error, onClose, onJobClick }: Props) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef                   = useRef<HTMLDivElement>(null)
  const [selectedChaineBatch, setSelectedChaineBatch] = useState<{ name: string; appName: string; traitementName: string } | null>(null)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e =>
      e.job.name.toLowerCase().includes(q) ||
      e.appName.toLowerCase().includes(q) ||
      e.values.some(v => v.toLowerCase().includes(q))
    )
  }, [entries, search])

  if (!isOpen) return null

  return createPortal(
    <>
      <div className="vtom-modal-overlay" onClick={onClose} style={{ zIndex: 1001 }}>
      <div
        className="vtom-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '860px', width: '92vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <button className="vtom-modal__close" onClick={onClose}>✕</button>

        <div className="vtom-modal__header">
          <h3>
            🔗 Traitements avec <code>CHAINE_BATCH</code>
            {!loading && entries.length > 0 && (
              <span className="chaine-batch-panel__count" style={{ marginLeft: '10px' }}>{entries.length}</span>
            )}
            {loading && (
              <span className="chaine-batch-panel__count chaine-batch-panel__count--loading" style={{ marginLeft: '10px' }}>…</span>
            )}
          </h3>

          {!loading && !error && entries.length > 0 && (
            <div className="chaine-batch-export" ref={exportRef}>
              <button
                className="chaine-batch-export__btn"
                onClick={() => setExportOpen(o => !o)}
                title="Exporter la liste"
              >
                ⬇ Exporter
              </button>
              {exportOpen && (
                <div className="chaine-batch-export__menu">
                  <button onClick={() => { exportCSV(filtered); setExportOpen(false) }}>
                    📄 CSV (.csv)
                  </button>
                  <button onClick={() => { exportJSON(filtered); setExportOpen(false) }}>
                    📋 JSON (.json)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {!loading && !error && entries.length > 0 && (
          <div className="chaine-batch-search">
            <span className="chaine-batch-search__icon">🔍</span>
            <input
              type="search"
              className="chaine-batch-search__input"
              placeholder="Filtrer par traitement, application ou valeur…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <span className="chaine-batch-search__count">
                {filtered.length} / {entries.length}
              </span>
            )}
          </div>
        )}

        <div className="vtom-modal__body" style={{ flex: 1, overflow: 'auto' }}>
          {loading && (
            <div className="chaine-batch-panel__status">
              <span className="chaine-batch-panel__spinner">⏳</span>
              Scan des scripts en cours via SSH…
            </div>
          )}
          {!loading && error && (
            <div className="chaine-batch-panel__status chaine-batch-panel__status--error">
              ⚠️ {error}
            </div>
          )}
          {!loading && !error && entries.length === 0 && (
            <div className="chaine-batch-panel__status">
              Aucun traitement avec <code>CHAINE_BATCH</code> trouvé.
            </div>
          )}
          {!loading && !error && entries.length > 0 && filtered.length === 0 && (
            <div className="chaine-batch-panel__status">
              Aucun résultat pour « {search} ».
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <table className="chaine-batch-table">
              <thead>
                <tr>
                  <th>Traitement</th>
                  <th>Application</th>
                  <th>CHAINE_BATCH</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => (
                  <tr
                    key={i}
                    className="chaine-batch-table__row"
                    onClick={() => { onJobClick(entry.job, entry.appName); onClose() }}
                  >
                    <td className="chaine-batch-table__job">
                      <span className="chaine-batch-table__job-name">{entry.job.name}</span>
                    </td>
                    <td className="chaine-batch-table__app">{entry.appName}</td>
                    <td>
                      <div className="chaine-batch-table__values">
                        {entry.values.map((v, j) => (
                          <button
                            key={j}
                            type="button"
                            className="chaine-batch-badge chaine-batch-badge--clickable"
                            title={`Voir les sous-programmes de ${v}`}
                            onClick={e => { e.stopPropagation(); setSelectedChaineBatch({ name: v.trim(), appName: entry.appName, traitementName: entry.job.name }) }}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </div>
      <SousProgrammesModal
        chaineBatchName={selectedChaineBatch?.name ?? null}
        isOpen={selectedChaineBatch !== null}
        appName={selectedChaineBatch?.appName}
        traitementName={selectedChaineBatch?.traitementName}
        onClose={() => setSelectedChaineBatch(null)}
      />
    </>,
    document.body
  )
}