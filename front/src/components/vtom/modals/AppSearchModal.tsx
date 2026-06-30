import { createPortal } from 'react-dom'
import type { ApplicationNode } from '../../../types/vtom'
import { softenColor } from '../../../utils/vtomColors'

interface Props {
  applications: ApplicationNode[]
  searchTerm: string
  isDark: boolean
  onSearchChange: (term: string) => void
  onSelectApp: (app: ApplicationNode) => void
  onClose: () => void
}

/** Recherche d'applications : filtrage temps réel par nom. */
export function AppSearchModal({
  applications, searchTerm, isDark,
  onSearchChange, onSelectApp, onClose,
}: Props) {
  const needle = searchTerm.toLowerCase()
  const filtered = applications.filter(a => a.name.toLowerCase().includes(needle))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', fontSize: '16px',
    border: `2px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
    borderRadius: '8px', marginBottom: '16px', outline: 'none',
    transition: 'border-color 0.2s',
    backgroundColor: isDark ? '#1e2433' : 'transparent',
    color: isDark ? '#e2e8f0' : 'inherit',
  }

  const listStyle: React.CSSProperties = {
    maxHeight: '400px', overflowY: 'auto',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
    borderRadius: '8px',
    backgroundColor: isDark ? '#111827' : '#fafbfc',
  }

  return createPortal(
    <div className="vtom-modal-overlay" onClick={onClose}>
      <div
        className="vtom-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '600px', maxHeight: '80vh' }}
      >
        <button className="vtom-modal__close" onClick={onClose}>✕</button>
        <div className="vtom-modal__header"><h3>🔎 Rechercher une application</h3></div>
        <div className="vtom-modal__body">
          <input
            type="text"
            placeholder="Tapez le nom d'une application..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            autoFocus
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = '#667eea' }}
            onBlur={e => { e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}
          />

          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
            {filtered.length} application{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}
          </div>

          <div style={listStyle}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
                Aucune application trouvée
              </div>
            ) : filtered.map((app, i) => (
              <div
                key={i}
                onClick={() => onSelectApp(app)}
                className="vtom-search-row"
                style={{
                  padding: '16px 20px',
                  borderBottom: i < filtered.length - 1
                    ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb'}`
                    : 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}
              >
                <span style={{
                  display: 'inline-block', width: '24px', height: '24px',
                  backgroundColor: softenColor(app.background), borderRadius: '4px', flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: isDark ? '#e2e8f0' : '#111827', marginBottom: '4px' }}>
                    {app.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    {app.jobsCount || 0} traitement{(app.jobsCount || 0) > 1 ? 's' : ''} •
                    {app.family ? ` ${app.family}` : ' Sans famille'}
                  </div>
                </div>
                <span style={{ fontSize: '20px', color: '#9ca3af' }}>→</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
