import { createPortal } from 'react-dom'

export interface MigradoField {
  name: string
  schema: string
  segment: string
}

interface Props {
  paramName: string | null
  fields: MigradoField[]
  loading: boolean
  error: string | null
  isDark: boolean
  onClose: () => void
  onViewXml: () => void
}

export function MigradoInfoModal({
  paramName, fields, loading, error, isDark, onClose, onViewXml,
}: Props) {
  return createPortal(
    <div className="vtom-modal-overlay" onClick={onClose} style={{ zIndex: 1001 }}>
      <div className="vtom-modal migrado-info-modal" onClick={e => e.stopPropagation()}>
        <button className="vtom-modal__close" onClick={onClose}>✕</button>

        <div className="vtom-modal__header">
          <h3>Info Migrado</h3>
          {paramName && (
            <span className="script-modal__path">
              /nfs/pay01/migrado/SLR/migrado-{paramName}.xml
            </span>
          )}
        </div>

        <div className="vtom-modal__body">
          {loading && (
            <div className="script-modal__loading">
              <div className="script-modal__loading-icon">⏳</div>
              Récupération du fichier XML en cours...
            </div>
          )}

          {error && !loading && (
            <div className={`script-modal__error ${isDark ? 'script-modal__error--dark' : ''}`}>
              <span>⚠️</span>
              <div>
                <strong>Erreur lors de la récupération :</strong><br />
                {error}
              </div>
            </div>
          )}

          {!loading && !error && fields.length === 0 && (
            <div className="value--muted" style={{ padding: '12px 0' }}>
              Aucun champ trouvé après les balises filebase.
            </div>
          )}

          {!loading && fields.length > 0 && (
            <table className="migrado-fields-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Schema</th>
                  <th>Segment</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={i}>
                    <td>{f.name}</td>
                    <td><code>{f.schema}</code></td>
                    <td><code>{f.segment}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && (fields.length > 0 || error === null) && (
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="script-load-btn"
                onClick={onViewXml}
              >
                📄 Voir le XML brut
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
