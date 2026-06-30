import { createPortal } from 'react-dom'
import type { Job, ApplicationNode } from '../../../types/vtom'
import { softenColor } from '../../../utils/vtomColors'

interface Props {
  jobs: Job[]
  applications: ApplicationNode[]
  searchTerm: string
  isDark: boolean
  onSearchChange: (term: string) => void
  onSelectJob: (job: Job, parentApp: ApplicationNode) => void
  onClose: () => void
}

export function JobSearchModal({
  jobs, applications, searchTerm, isDark,
  onSearchChange, onSelectJob, onClose,
}: Props) {
  const term = searchTerm.toLowerCase()
  const filtered = jobs.filter(j =>
    j.name.toLowerCase().includes(term) ||
    (j.parentApp ?? '').toLowerCase().includes(term)
  )

  return createPortal(
    <div className="vtom-modal-overlay" onClick={onClose}>
      <div className="vtom-modal search-modal search-modal--jobs" onClick={e => e.stopPropagation()}>
        <button className="vtom-modal__close" onClick={onClose}>✕</button>
        <div className="vtom-modal__header"><h3>🔍 Rechercher un traitement</h3></div>

        <div className="vtom-modal__body">
          <input
            type="text"
            className={`search-modal__input ${isDark ? 'search-modal__input--dark' : ''}`}
            placeholder="Nom du traitement ou de l'application..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            autoFocus
          />

          <div className="search-modal__count">
            {filtered.length} traitement{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </div>

          <div className={`search-modal__list ${isDark ? 'search-modal__list--dark' : ''}`}>
            {filtered.length === 0 ? (
              <div className="search-modal__empty">Aucun traitement trouvé</div>
            ) : filtered.map((job, i) => {
              const parentApp = applications.find(a => a.name === job.parentApp)
              const appColor = parentApp ? softenColor(parentApp.background) : '#6b7280'
              return (
                <div
                  key={i}
                  className={`search-modal__item ${!parentApp ? 'search-modal__item--disabled' : ''}`}
                  onClick={() => { if (parentApp) onSelectJob(job, parentApp) }}
                >
                  <span className="search-modal__dot" style={{ backgroundColor: appColor }} />
                  <div className="search-modal__content">
                    <div className="search-modal__title">{job.name}</div>
                    <div className="search-modal__meta">
                      <span
                        className="search-modal__app-tag"
                        style={{ backgroundColor: `${appColor}33`, color: appColor }}
                      >
                        {job.parentApp ?? '—'}
                      </span>
                      {job.script && (
                        <span className="search-modal__script">{job.script}</span>
                      )}
                    </div>
                  </div>
                  {parentApp && <span className="search-modal__arrow">→</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
