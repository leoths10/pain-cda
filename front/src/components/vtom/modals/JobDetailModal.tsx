import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { SelectedJob, VtomResource } from '../../../types/vtom'
import { getStatusIcon } from '../../../utils/vtomColors'
import { ParameterDisplay } from '../ParameterDisplay'
import { SousProgrammesModal } from '../SousProgrammesModal'

interface Props {
  selectedJob: SelectedJob
  isDark: boolean
  resources: Map<string, VtomResource>
  scriptLoading: boolean
  scriptReady: boolean
  chaineBatch?: string[] | null
  migradoXmlLoading?: boolean
  onClose: () => void
  onFetchScript: (path: string) => void
  onFetchMigradoXml?: (paramName: string) => void
}

export function JobDetailModal({
  selectedJob, isDark, resources,
  scriptLoading, scriptReady, chaineBatch,
  migradoXmlLoading, onClose, onFetchScript, onFetchMigradoXml,
}: Props) {
  const { job, appName } = selectedJob
  const [selectedCB, setSelectedCB] = useState<string | null>(null)

  const isMigradoIntegrer =
    appName.toUpperCase().includes('MIGRADO') &&
    job.name.toUpperCase() === 'INTEGRER'
  const migradoParam = isMigradoIntegrer ? (job.parameters?.[0] ?? null) : null

  const xmlButtonLabel = migradoXmlLoading
    ? '⏳ Chargement...'
    : '📋 Info Migrado'

  const scriptButtonLabel = scriptLoading
    ? '⏳ Chargement...'
    : scriptReady ? '📄 Afficher le Script' : '📄 Charger le Script'

  return createPortal(
    <>
      <div className="vtom-modal-overlay" onClick={onClose} style={{ zIndex: 1001 }}>
        <div className="vtom-modal job-detail-modal" onClick={e => e.stopPropagation()}>
          <button className="vtom-modal__close" onClick={onClose}>✕</button>

          <div className="vtom-modal__header">
            <h3>{job.name}</h3>
            <span className="status-badge">{getStatusIcon(job.status)} {job.status || 'N/A'}</span>
          </div>

          <div className="vtom-modal__body">
            <div className="detail-row">
              <span className="label">Application:</span>
              <span className="value">{appName}</span>
            </div>

            {job.script ? (
              <div className="detail-row detail-row--script">
                <span className="label">Chemin du script:</span>
                <div className="script-path-block">
                  <span className={`script-path ${isDark ? 'script-path--dark' : ''}`}>{job.script}</span>
                  <button
                    type="button"
                    className="script-load-btn"
                    onClick={() => onFetchScript(job.script!)}
                    disabled={scriptLoading}
                  >
                    {scriptButtonLabel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="detail-row">
                <span className="label">Script:</span>
                <span className="value value--muted">Aucun script associé à ce traitement</span>
              </div>
            )}

            {migradoParam && onFetchMigradoXml && (
              <div className="detail-row detail-row--script">
                <span className="label">Fichier XML:</span>
                <div className="script-path-block">
                  <span className={`script-path ${isDark ? 'script-path--dark' : ''}`}>
                    /nfs/pay01/migrado/SLR/migrado-{migradoParam}.xml
                  </span>
                  <button
                    type="button"
                    className="script-load-btn"
                    onClick={() => onFetchMigradoXml(migradoParam)}
                    disabled={migradoXmlLoading}
                  >
                    {xmlButtonLabel}
                  </button>
                </div>
              </div>
            )}

            {job.parameters && job.parameters.length > 0 && (
              <div className="detail-row detail-row--params">
                <span className="label">Paramètres:</span>
                <div className="params-list">
                  {job.parameters.map((param, i) => (
                    <ParameterDisplay key={i} param={param} resources={resources} />
                  ))}
                </div>
              </div>
            )}

            {chaineBatch && chaineBatch.length > 0 && (
              <div className="detail-row detail-row--batch">
                <span className="label">Chaîne batch:</span>
                <div className="batch-badges">
                  {chaineBatch.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      className="batch-badge"
                      title={`Voir les sous-programmes de ${item}`}
                      onClick={e => { e.stopPropagation(); setSelectedCB(item) }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`job-meta-grid ${isDark ? 'job-meta-grid--dark' : ''}`}>
              {job.frequency && <div className="detail-row"><span className="label">Fréquence:</span><span className="value">{job.frequency}</span></div>}
              {job.mode && <div className="detail-row"><span className="label">Mode:</span><span className="value">{job.mode}</span></div>}
              {job.minStart && <div className="detail-row"><span className="label">Heure min:</span><span className="value">{job.minStart}</span></div>}
              {job.maxStart && <div className="detail-row"><span className="label">Heure max:</span><span className="value">{job.maxStart}</span></div>}
              {job.retcode && <div className="detail-row"><span className="label">Code retour:</span><span className="value">{job.retcode}</span></div>}
            </div>

            {job.background && (
              <div className="detail-row detail-row--color">
                <span className="label">Couleur:</span>
                <span className="value">
                  <span className="color-swatch" style={{ backgroundColor: job.background }} />
                  {job.background}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <SousProgrammesModal
        chaineBatchName={selectedCB}
        isOpen={selectedCB !== null}
        appName={appName}
        traitementName={job.name}
        onClose={() => setSelectedCB(null)}
      />
    </>,
    document.body,
  )
}
