import { createPortal } from 'react-dom'
import type { ApplicationNode, Job, VtomResource, GraphComment } from '../../../types/vtom'
import { softenColor, getStatusIcon } from '../../../utils/vtomColors'
import { clipToRect, cleanHtmlLabel, wrapText } from '../../../utils/vtomHelpers'
import { ParameterDisplay } from '../ParameterDisplay'

interface Props {
  app: ApplicationNode
  isDark: boolean
  resources: Map<string, VtomResource>
  onClose: () => void
  onJobClick: (job: Job, appName: string, e: React.MouseEvent) => void
  getJobLinksForApp: (appName: string, jobs: Job[]) => Array<{ from: string; to: string; type: string }>
}

/** Rendu SVG d'un commentaire positionné à l'intérieur du schéma d'une application. */
function GraphCommentNode({ comment, isDark }: { comment: GraphComment; isDark: boolean }) {
  const text = cleanHtmlLabel(comment.label)
  const fontSize = 12
  const lineHeight = fontSize + 4
  const lines = wrapText(text, Math.floor(comment.width / (fontSize * 0.6)))
  const bg = comment.background && comment.background !== '#000000'
    ? comment.background
    : isDark ? 'rgba(255,255,180,0.12)' : 'rgba(255,255,200,0.85)'
  const fg = comment.foreground && comment.foreground !== '#000000'
    ? comment.foreground
    : isDark ? '#fde68a' : '#92400e'
  const PAD = 8
  const boxH = Math.max(comment.height, lines.length * lineHeight + PAD * 2)

  return (
    <g>
      <rect
        x={comment.x} y={comment.y} width={comment.width} height={boxH}
        fill={bg} rx="4" strokeWidth="1"
        stroke={isDark ? 'rgba(253,230,138,0.3)' : 'rgba(180,140,0,0.3)'}
        style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' }}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={comment.x + PAD}
          y={comment.y + PAD + fontSize + i * lineHeight}
          fill={fg} fontSize={fontSize} fontStyle="italic"
        >
          {line}
        </text>
      ))}
    </g>
  )
}

const DEFAULT_JOB_WIDTH = 280
const DEFAULT_JOB_HEIGHT = 80

export function AppDetailModal({ app, isDark, resources, onClose, onJobClick, getJobLinksForApp }: Props) {
  const jobLinks = app.jobs ? getJobLinksForApp(app.name, app.jobs) : []

  // Layout auto-placement : grille 3 colonnes si pas de coordonnées déclarées
  const jobs = (app.jobs ?? []).map((job, index) => ({
    ...job,
    x: job.x ?? 20 + (index % 3) * (DEFAULT_JOB_WIDTH + 40),
    y: job.y ?? 20 + Math.floor(index / 3) * (DEFAULT_JOB_HEIGHT + 40),
    width: job.width ?? DEFAULT_JOB_WIDTH,
    height: job.height ?? DEFAULT_JOB_HEIGHT,
  }))

  const canvasWidth = Math.max(
    800,
    ...jobs.map(j => j.x + j.width),
    ...(app.graphComments ?? []).map(c => c.x + c.width),
  ) + 50
  const canvasHeight = Math.max(
    500,
    ...jobs.map(j => j.y + j.height),
    ...(app.graphComments ?? []).map(c => c.y + c.height),
  ) + 50

  const hasContent = (app.jobs && app.jobs.length > 0) || (app.graphComments && app.graphComments.length > 0)

  return createPortal(
    <div className="vtom-modal-overlay" onClick={onClose}>
      <div className="vtom-modal" onClick={e => e.stopPropagation()}>
        <button className="vtom-modal__close" onClick={onClose}>✕</button>

        <div className="vtom-modal__header">
          <h3>{app.name}</h3>
          <span className="status-badge">{getStatusIcon(app.status)} {app.status || 'N/A'}</span>
        </div>

        <div className="vtom-modal__body">
          <div className="detail-row">
            <span className="label">Famille:</span>
            <span className="value">{app.family || 'N/A'}</span>
          </div>
          <div className="detail-row">
            <span className="label">Position:</span>
            <span className="value">X: {app.x}, Y: {app.y}</span>
          </div>
          <div className="detail-row">
            <span className="label">Couleur:</span>
            <span className="value">
              <span className="color-swatch" style={{ backgroundColor: app.background }} />
              {app.background}
            </span>
          </div>
          {app.cycleEnabled === '1' && (
            <div className="detail-row">
              <span className="label">Cycle:</span>
              <span className="value">{app.cycle || 'N/A'}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="label">Nombre de jobs:</span>
            <span className="value">{app.jobsCount || 0}</span>
          </div>
          {app.comment && (
            <div className="detail-row">
              <span className="label">Commentaire:</span>
              <span className="value">{app.comment}</span>
            </div>
          )}

          {app.expectedResources && app.expectedResources.length > 0 && (
            <div className="detail-row detail-row--resources">
              <span className="label">Ressources:</span>
              <div className="app-resources">
                {app.expectedResources.map((er, i) => {
                  const variant = er.operator === '!' ? 'excl' : er.operator === 'P' ? 'prod' : 'ok'
                  return (
                    <span key={i} className={`resource-chip resource-chip--${variant}`}
                      title={resources.get(er.resource)?.comment || er.resource}>
                      {er.resource}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {hasContent && (
            <div className="jobs-section">
              <h4 className="jobs-section__title">
                {app.jobs && app.jobs.length > 0
                  ? <>Traitements ({app.jobs.length}){jobLinks.length > 0 && ` • ${jobLinks.length} lien(s)`}</>
                  : <>📋 Schéma</>
                }
              </h4>

              <div className={`jobs-canvas ${isDark ? 'jobs-canvas--dark' : ''}`}>
                <svg width={canvasWidth} height={canvasHeight}>
                  <defs>
                    <pattern id="job-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                      <path d="M 50 0 L 0 0 0 50" fill="none"
                        stroke={isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'} strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#job-grid)" />

                  {jobLinks.map((link, li) => {
                    const from = jobs.find(j => j.name === link.from)
                    const to = jobs.find(j => j.name === link.to)
                    if (!from || !to) return null
                    const [x1, y1] = clipToRect(to.x + to.width / 2, to.y + to.height / 2, from.x, from.y, from.width, from.height)
                    const [x2, y2] = clipToRect(from.x + from.width / 2, from.y + from.height / 2, to.x, to.y, to.width, to.height)
                    const color = link.type === 'E' ? '#ef4444' : '#3b82f6'
                    return (
                      <g key={`jlink-${li}`}>
                        <defs>
                          <marker id={`job-arrow-${li}`} markerWidth="8" markerHeight="8"
                            refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                            <path d="M0,0 L0,8 L8,4 z" fill={color} opacity="0.9" />
                          </marker>
                        </defs>
                        <line x1={x2} y1={y2} x2={x1} y2={y1}
                          stroke={color} strokeWidth="2.5" strokeOpacity="0.75"
                          markerEnd={`url(#job-arrow-${li})`} />
                      </g>
                    )
                  })}

                  {jobs.map((job, ji) => (
                    <g key={`job-node-${ji}`} className="job-node"
                      onClick={e => onJobClick(job, app.name, e)}
                      style={{ cursor: 'pointer' }}>
                      <rect x={job.x} y={job.y} width={job.width} height={job.height}
                        fill={softenColor(job.background || '#9932cc')}
                        stroke="rgba(255,255,255,0.5)" strokeWidth="2" rx="8"
                        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
                      <text x={job.x + job.width / 2} y={job.y + job.height / 2 + 5}
                        textAnchor="middle" fill="white" fontSize="15" fontWeight="700">
                        {job.name.length > 25 ? job.name.substring(0, 23) + '...' : job.name}
                      </text>
                    </g>
                  ))}

                  {(app.graphComments ?? []).map((comment, ci) => (
                    <GraphCommentNode key={`gc-${ci}`} comment={comment} isDark={isDark} />
                  ))}
                </svg>
              </div>

              {app.jobs && app.jobs.length > 0 && (
                <details className="jobs-details">
                  <summary>📋 Voir les détails complets</summary>
                  <div className="jobs-list">
                    {app.jobs.map((job, ji) => (
                      <div key={ji} className="job-card"
                        style={{ borderLeftColor: softenColor(job.background || '#9932cc') }}>
                        <div className="job-card__header">
                          <h5>{job.name}</h5>
                          {job.status && (
                            <span className="job-card__status">
                              {getStatusIcon(job.status)} {job.status}
                            </span>
                          )}
                        </div>
                        <div className="job-card__fields">
                          {job.script && (
                            <div className="job-card__row">
                              <span className="job-card__label">Script:</span>
                              <span className="job-card__value job-card__value--mono">{job.script}</span>
                            </div>
                          )}
                          {job.parameters && job.parameters.length > 0 && (
                            <div className="job-card__row">
                              <span className="job-card__label">Paramètres:</span>
                              <div className="job-card__params">
                                {job.parameters.map((param, pi) => (
                                  <ParameterDisplay key={pi} param={param} resources={resources} />
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="job-card__grid">
                            {job.frequency && <div><span className="job-card__label">Fréquence:</span> {job.frequency}</div>}
                            {job.mode && <div><span className="job-card__label">Mode:</span> {job.mode}</div>}
                            {job.minStart && <div><span className="job-card__label">Début min:</span> {job.minStart}</div>}
                            {job.maxStart && <div><span className="job-card__label">Début max:</span> {job.maxStart}</div>}
                            {job.retcode && <div><span className="job-card__label">Code retour:</span> {job.retcode}</div>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
