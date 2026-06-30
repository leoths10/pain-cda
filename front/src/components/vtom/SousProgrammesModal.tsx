import { createPortal } from 'react-dom'
import listeProg from '../../data/liste_prog.json'

/** Structure du JSON liste_prog :
 *  { [appName]: { [traitementName]: { [chaineBatchName]: string[] | {} } } }
 */
type ListeProgData = Record<string, Record<string, Record<string, string[] | Record<string, never>>>>

const data = listeProg as ListeProgData

/**
 * Cherche les sous-programmes associés à une chaîne batch dans toutes les
 * applications et tous les traitements du JSON liste_prog.
 *
 * Retourne un tableau de { appName, traitementName, sousPrograms } pour chaque
 * occurrence trouvée (une chaîne batch peut apparaître dans plusieurs traitements).
 */
export function findSousProgrammes(
  chaineBatchName: string,
  appName?: string,
  traitementName?: string,
): SousProgrammeMatch[] {
  const results: SousProgrammeMatch[] = []
  const needle = chaineBatchName.trim().toUpperCase()

  for (const [app, traitements] of Object.entries(data)) {
    // Si un contexte est fourni, on ne cherche que dans le bon chemin
    if (appName && app.toUpperCase() !== appName.toUpperCase()) continue

    for (const [trait, chaineBatches] of Object.entries(traitements)) {
      if (traitementName && trait.toUpperCase() !== traitementName.toUpperCase()) continue

      for (const [cbName, sousPrograms] of Object.entries(chaineBatches)) {
        if (cbName.toUpperCase() === needle) {
          results.push({
            appName: app,
            traitementName: trait,
            sousPrograms: Array.isArray(sousPrograms) ? sousPrograms : [],
          })
        }
      }
    }
  }

  return results
}

export interface SousProgrammeMatch {
  appName: string
  traitementName: string
  sousPrograms: string[]
}

interface Props {
  chaineBatchName: string | null
  isOpen: boolean
  onClose: () => void
  /** Contexte de l'application parente — restreint la recherche à ce chemin exact. */
  appName?: string
  /** Contexte du traitement parent — restreint la recherche à ce chemin exact. */
  traitementName?: string
}

export function SousProgrammesModal({ chaineBatchName, isOpen, onClose, appName, traitementName }: Props) {
  if (!isOpen || !chaineBatchName) return null

  const matches = findSousProgrammes(chaineBatchName, appName, traitementName)
  const totalSousPrograms = matches.reduce((acc, m) => acc + m.sousPrograms.length, 0)

  return createPortal(
    <div
      className="vtom-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1002 }}
    >
      <div
        className="vtom-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '90vw', maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}
      >
        <button className="vtom-modal__close" onClick={onClose}>✕</button>

        <div className="vtom-modal__header">
          <h3>
            📦 Sous-programmes de{' '}
            <code style={{ color: 'var(--vtom-accent)' }}>{chaineBatchName}</code>
          </h3>
          {matches.length > 0 && (
            <span className="sous-prog-modal__summary">
              {matches.length} traitement{matches.length > 1 ? 's' : ''} •{' '}
              {totalSousPrograms} sous-programme{totalSousPrograms > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="vtom-modal__body sous-prog-modal__body">
          {matches.length === 0 ? (
            <div className="chaine-batch-panel__status">
              ℹ️ <strong>{chaineBatchName}</strong> ne possède pas de sous-programmes.
            </div>
          ) : (
            matches.map((match, i) => (
              <div key={i} className="sous-prog-modal__group">
                <div className="sous-prog-modal__group-header">
                  <span className="sous-prog-modal__app-badge">{match.appName}</span>
                  <span className="sous-prog-modal__arrow">›</span>
                  <span className="sous-prog-modal__traitement">{match.traitementName}</span>
                </div>
                {match.sousPrograms.length === 0 ? (
                  <p className="sous-prog-modal__empty">Aucun sous-programme listé.</p>
                ) : (
                  <ol className="sous-prog-modal__list">
                    {match.sousPrograms.map((sp, j) => (
                      <li key={j} className="sous-prog-modal__item">
                        <span className="sous-prog-modal__index">{j + 1}</span>
                        <code className="sous-prog-modal__code">{sp}</code>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
