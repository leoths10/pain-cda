import type { ApplicationNode, ApplicationLink } from '../../types/vtom'
import { softenColor, getStatusIcon } from '../../utils/vtomColors'

interface Props {
  app: ApplicationNode
  links: ApplicationLink[]
  tooltipPos: { x: number; y: number }
  onMouseEnter: () => void
  onMouseLeave: () => void
}

/**
 * Tooltip riche affiché au survol d'une application (monté en portal).
 * Le parent gère la temporisation d'ouverture / fermeture.
 */
export function AppTooltip({ app, links, tooltipPos, onMouseEnter, onMouseLeave }: Props) {
  const outgoing = links.filter(l => l.from === app.name).length
  const incoming = links.filter(l => l.to === app.name).length
  const appColor = softenColor(app.background)
  const jobCount = app.jobsCount ?? app.jobs?.length ?? 0

  const left = Math.min(tooltipPos.x + 8, window.innerWidth - 320)
  const top = Math.max(8, Math.min(tooltipPos.y - 10, window.innerHeight - 420))

  return (
    <div
      className="app-tooltip"
      style={{ position: 'fixed', left, top, zIndex: 2000 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="app-tooltip__header"
        style={{ background: `linear-gradient(135deg, ${appColor} 0%, ${appColor}cc 100%)` }}
      >
        <div className="app-tooltip__header-left">
          <div className="app-tooltip__color-dot" style={{ backgroundColor: app.background }} />
          <span className="app-tooltip__name">{app.name}</span>
        </div>
        {app.status && (
          <span className="app-tooltip__status-badge">
            {getStatusIcon(app.status)} {app.status}
          </span>
        )}
      </div>

      {(app.family || app.cycleEnabled === '1') && (
        <div className="app-tooltip__meta">
          {app.family && (
            <span className="app-tooltip__meta-tag">
              <span className="app-tooltip__meta-icon">🗂</span>
              {app.family}
            </span>
          )}
          {app.cycleEnabled === '1' && app.cycle && (
            <span className="app-tooltip__meta-tag app-tooltip__meta-tag--cycle">
              <span className="app-tooltip__meta-icon">🔁</span>
              {app.cycle}
            </span>
          )}
        </div>
      )}

      <div className="app-tooltip__stats">
        <div className="app-tooltip__stat">
          <span className="app-tooltip__stat-value">{jobCount}</span>
          <span className="app-tooltip__stat-label">traitements</span>
        </div>
        <div className="app-tooltip__stat-divider" />
        <div className="app-tooltip__stat">
          <span className="app-tooltip__stat-value app-tooltip__stat-value--out">{outgoing}</span>
          <span className="app-tooltip__stat-label">↗ sortants</span>
        </div>
        <div className="app-tooltip__stat-divider" />
        <div className="app-tooltip__stat">
          <span className="app-tooltip__stat-value app-tooltip__stat-value--in">{incoming}</span>
          <span className="app-tooltip__stat-label">↙ entrants</span>
        </div>
      </div>

      {app.comment && (
        <div className="app-tooltip__comment">
          <span className="app-tooltip__comment-icon">💬</span>
          <span className="app-tooltip__comment-text">{app.comment}</span>
        </div>
      )}

      {app.jobs && app.jobs.length > 0 && (
        <div className="app-tooltip__jobs">
          <div className="app-tooltip__jobs-title">TRAITEMENTS</div>
          <div className="app-tooltip__jobs-grid">
            {app.jobs.slice(0, 6).map((job, i) => (
              <div key={i} className="app-tooltip__job-item">
                <span
                  className="app-tooltip__job-dot"
                  style={{ backgroundColor: softenColor(job.background ?? '#9932cc') }}
                />
                <span className="app-tooltip__job-name">{job.name}</span>
              </div>
            ))}
          </div>
          {app.jobs.length > 6 && (
            <div className="app-tooltip__jobs-more">
              +{app.jobs.length - 6} autre{app.jobs.length - 6 > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      <div className="app-tooltip__footer">
        <span className="app-tooltip__hint">Cliquez pour voir les détails →</span>
      </div>
    </div>
  )
}
