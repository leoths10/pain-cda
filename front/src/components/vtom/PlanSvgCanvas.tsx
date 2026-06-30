import { useMemo } from 'react'
import type {
  ApplicationNode, ApplicationLink, TrafficLight,
  Comment, Column, Separator,
} from '../../types/vtom'
import { softenColor, getStatusIcon } from '../../utils/vtomColors'
import { isCommentNearApp, cleanHtmlLabel, wrapText, clipToRect } from '../../utils/vtomHelpers'
import type { DocAnnotation, DocArrow } from '../../types/planDoc'
import type { EditTool } from '../../hooks/usePlanDocs'
import { AnnotationLayer } from './AnnotationLayer'

/** Props du calque documentaire superposé au plan (optionnel). */
export interface DocLayerProps {
  annotations: DocAnnotation[]
  arrows: DocArrow[]
  editMode: boolean
  tool: EditTool
  arrowFrom: string | null
  onPlaceAnnotation: (x: number, y: number) => void
  onMoveAnnotation: (uid: string, x: number, y: number) => void
  onEditAnnotation: (uid: string) => void
  onDeleteAnnotation: (uid: string) => void
  onAnnotationClick: (uid: string) => void
}

interface Props {
  applications: ApplicationNode[]
  links: ApplicationLink[]
  trafficLights: TrafficLight[]
  comments: Comment[]
  columns: Column[]
  separators: Separator[]
  scale: number
  isPanning: boolean
  hoveredApp: string | null
  highlightedApp: string | null
  hoveredComment: number | null
  isDark: boolean
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  onMouseUp: () => void
  onAppClick: (app: ApplicationNode, e: React.MouseEvent) => void
  onAppMouseEnter: (app: ApplicationNode, e: React.MouseEvent<SVGGElement>) => void
  onAppMouseLeave: () => void
  onCommentMouseEnter: (index: number) => void
  onCommentMouseLeave: () => void
  svgRef: React.RefObject<SVGSVGElement | null>
  docLayer?: DocLayerProps
}

const APP_H = 55
const CANVAS_W = 3000
const CANVAS_H = 7000

/**
 * Canvas SVG principal du plan VTOM (3000 × 7000 en coords internes).
 * Rend : colonnes, séparateurs, liens, applications, feux, commentaires.
 */
export function PlanSvgCanvas({
  applications, links, trafficLights, comments, columns, separators,
  scale, isPanning, hoveredApp, highlightedApp, hoveredComment, isDark,
  onMouseDown, onMouseMove, onMouseUp,
  onAppClick, onAppMouseEnter, onAppMouseLeave,
  onCommentMouseEnter, onCommentMouseLeave,
  svgRef, docLayer,
}: Props) {
  // Index O(1) utilisés dans les boucles de render pour éviter applications.find / links.some
  // qui dégénèrent en O(L×A) sur les hovers.
  const appByName = useMemo(() => {
    const map = new Map<string, ApplicationNode>()
    for (const app of applications) map.set(app.name, app)
    return map
  }, [applications])

  /** Voisins (entrants + sortants) de chaque app, indexés par nom. */
  const neighborsByApp = useMemo(() => {
    const map = new Map<string, Set<string>>()
    const push = (k: string, v: string) => {
      const s = map.get(k) ?? new Set<string>()
      s.add(v)
      map.set(k, s)
    }
    for (const l of links) {
      push(l.from, l.to)
      push(l.to, l.from)
    }
    return map
  }, [links])

  const leftOffset = useMemo(() => {
    let min = Infinity
    for (const a of applications) if (a.x < min) min = a.x
    for (const c of comments) if (c.x < min) min = c.x
    for (const t of trafficLights) if (t.x < min) min = t.x
    for (const c of columns) if (c.x < min) min = c.x
    return 40 - (Number.isFinite(min) ? min : 0)
  }, [applications, comments, trafficLights, columns])

  const labelGroups = useMemo(() => {
    const groups: Record<string, Separator[]> = {}
    for (const s of separators) {
      if (s.isVertical || !s.label || s.label === 'Nouveau noeud' || !s.textVisible) continue
      ;(groups[s.label] ??= []).push(s)
    }
    return groups
  }, [separators])

  /** Layouts dérivés des commentaires, calculés hors render pour ne pas re-parser à chaque hover. */
  const commentLayouts = useMemo(() => comments.map(c => {
    const [, sizeStr, boldStr, italicStr] = c.font.split('#')
    const fontSize = parseInt(sizeStr, 10) || 12
    const cleanLabel = cleanHtmlLabel(c.label)
    return {
      fontSize,
      isBold: boldStr === 'true',
      isItalic: italicStr === 'true',
      cleanLabel,
      lines: wrapText(cleanLabel, Math.floor(c.width / (fontSize * 0.55))),
    }
  }), [comments])

  if (applications.length === 0) return null

  const lineColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)'

  // En mode "ajout d'annotation", un clic sur le fond pose une annotation
  // (dans le repère du groupe translaté) au lieu de démarrer un pan.
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (docLayer?.editMode && docLayer.tool === 'annotation') {
      const svg = svgRef.current
      const ctm = svg?.getScreenCTM()
      if (svg && ctm) {
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const p = pt.matrixTransform(ctm.inverse())
        docLayer.onPlaceAnnotation(p.x - leftOffset, p.y)
        return
      }
    }
    onMouseDown(e)
  }

  return (
    <svg
      ref={svgRef}
      className={`vtom-plan-svg ${isPanning ? 'panning' : ''}`}
      width={CANVAS_W * scale}
      height={CANVAS_H * scale}
      viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
      onMouseDown={handleSvgMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <defs>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path
            d="M 100 0 L 0 0 0 100"
            fill="none"
            stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={isDark ? '#111827' : '#fafbfc'} />
      <rect width="100%" height="100%" fill="url(#grid)" />

      <g transform={`translate(${leftOffset}, 0)`}>
        {/* Colonnes */}
        {columns.map((col, i) => (
          <g key={`col-${i}`} className="column-group">
            <rect
              x={col.x} y={0} width={col.width} height={CANVAS_H}
              fill={col.color} fillOpacity={isDark ? 0.10 : 0.07} stroke="none"
            />
            {i > 0 && (
              <line x1={col.x} y1={0} x2={col.x} y2={CANVAS_H} stroke={col.color} strokeWidth="2" strokeOpacity="0.7" />
            )}
          </g>
        ))}

        {/* Séparateurs simples (un seul par label) */}
        {Object.entries(labelGroups)
          .filter(([, arr]) => arr.length === 1)
          .map(([label, arr], i) => {
            const s = arr[0]
            const fontSize = parseInt(s.font.split('#')[1] || '11', 10) + 2
            const labelBg = isDark ? '#2d3748' : '#e2e8f0'
            const labelText = isDark ? '#e2e8f0' : '#1a202c'
            return (
              <g key={`sep-single-${i}`}>
                <line x1={s.x} y1={s.y + s.height / 2} x2={s.x + s.width} y2={s.y + s.height / 2}
                      stroke={lineColor} strokeWidth="2" />
                <line x1={s.x} y1={s.y} x2={s.x} y2={s.y + s.height} stroke={lineColor} strokeWidth="2" />
                <line x1={s.x + s.width} y1={s.y} x2={s.x + s.width} y2={s.y + s.height} stroke={lineColor} strokeWidth="2" />
                <rect
                  x={s.x + 10} y={s.y - fontSize - 6}
                  width={label.length * fontSize * 0.62 + 20} height={fontSize + 10}
                  fill={labelBg} rx="4"
                />
                <text
                  x={s.x + 20} y={s.y + 1}
                  fill={labelText} fontSize={fontSize} fontWeight="700"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {label}
                </text>
              </g>
            )
          })}

        {/* Séparateurs en paire (encadrement) */}
        {Object.entries(labelGroups)
          .filter(([, arr]) => arr.length >= 2)
          .map(([label, arr], i) => {
            const sorted = [...arr].sort((a, b) => a.y - b.y)
            const top = sorted[0]
            const bottom = sorted[sorted.length - 1]
            const fontSize = parseInt(top.font.split('#')[1] || '11', 10) + 2
            const accent = isDark ? '#fcd34d' : '#92400e'
            const bg = isDark ? 'rgba(251,191,36,0.08)' : 'rgba(146,64,14,0.06)'
            const frameH = (bottom.y + bottom.height) - top.y
            return (
              <g key={`sep-frame-${i}`}>
                <rect x={top.x} y={top.y} width={top.width} height={frameH}
                      fill={bg} stroke={accent} strokeWidth="2" strokeOpacity="0.8" rx="4" />
                <rect
                  x={top.x + 8} y={top.y - (fontSize + 6)}
                  width={label.length * fontSize * 0.62 + 20} height={fontSize + 10}
                  fill={isDark ? '#2d2010' : '#fef3c7'}
                  stroke={accent} strokeWidth="1.5" strokeOpacity="0.9" rx="4"
                />
                <text
                  x={top.x + 18} y={top.y + 2}
                  fill={accent} fontSize={fontSize} fontWeight="800" letterSpacing="0.8"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {label.toUpperCase()}
                </text>
              </g>
            )
          })}

        {/* Liens de dépendance entre applications */}
        {links.map((link, i) => {
          const from = appByName.get(link.from)
          const to = appByName.get(link.to)
          if (!from || !to) return null

          const [x1, y1] = clipToRect(to.x + to.width / 2, to.y + APP_H / 2, from.x, from.y, from.width, APP_H)
          const [x2, y2] = clipToRect(from.x + from.width / 2, from.y + APP_H / 2, to.x, to.y, to.width, APP_H)
          const isActive = hoveredApp === link.from || hoveredApp === link.to
          const isDimmed = hoveredApp !== null && !isActive
          const color = link.type === 'E' ? '#ef4444' : (isDark ? '#93c5fd' : '#2563eb')

          return (
            <g
              key={`link-${i}`}
              className="app-link"
              style={{ opacity: isDimmed ? 0.12 : 1, transition: 'opacity 0.2s ease' }}
            >
              <defs>
                <marker
                  id={`arrow-${i}`} markerWidth="8" markerHeight="8"
                  refX="7" refY="4" orient="auto" markerUnits="strokeWidth"
                >
                  <path d="M0,0 L0,8 L8,4 z" fill={color} opacity="0.9" />
                </marker>
              </defs>
              <line
                x1={x2} y1={y2} x2={x1} y2={y1}
                stroke={color}
                strokeWidth={isActive ? '3.5' : '2.5'}
                strokeOpacity={isActive ? 1 : 0.75}
                markerEnd={`url(#arrow-${i})`}
              />
            </g>
          )
        })}

        {/* Applications */}
        {applications.map((app, i) => {
          const isConnected = hoveredApp !== null
            && hoveredApp !== app.name
            && (neighborsByApp.get(hoveredApp)?.has(app.name) ?? false)
          const isDimmed = hoveredApp !== null && hoveredApp !== app.name && !isConnected
          const isHighlighted = highlightedApp === app.name

          return (
            <g
              key={`app-${i}`}
              className="app-node"
              onClick={e => onAppClick(app, e)}
              onMouseEnter={e => onAppMouseEnter(app, e)}
              onMouseLeave={onAppMouseLeave}
              style={{ cursor: 'pointer', opacity: isDimmed ? 0.45 : 1 }}
            >
              {isHighlighted && (
                <rect
                  x={app.x - 6} y={app.y - 6} width={app.width + 12} height={67}
                  fill="none" stroke="#fbbf24" strokeWidth="3" rx="10"
                  className="app-highlight-ring"
                />
              )}
              <rect
                x={app.x} y={app.y} width={app.width} height={APP_H}
                fill={softenColor(app.background)} stroke="rgba(255,255,255,0.3)"
                strokeWidth="2" rx="6" className="app-rect"
              />
              <text
                x={app.x + app.width / 2} y={app.y + 20}
                textAnchor="middle" fill="white" fontSize="12" fontWeight="600"
                className="app-name"
              >
                {app.name.length > 16 ? app.name.substring(0, 14) + '...' : app.name}
              </text>
              <text
                x={app.x + app.width / 2} y={app.y + 38}
                textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="11"
              >
                {getStatusIcon(app.status)} {app.jobsCount ? `${app.jobsCount} traitement(s)` : ''}
              </text>
            </g>
          )
        })}

        {/* Feux tricolores */}
        {trafficLights.map((light, i) => (
          <g key={`light-${i}`} className="traffic-light">
            <rect
              x={light.x} y={light.y} width={50} height={50}
              fill={isDark ? '#1e2433' : '#ffffff'} fillOpacity="0.8"
              stroke="#ff0000" strokeWidth="2" rx="8"
            />
            <text
              x={light.x + 25} y={light.y + 37}
              textAnchor="middle" fontSize="30" style={{ userSelect: 'none' }}
            >
              🚦
            </text>
            {light.label?.trim() && <title>{light.label}</title>}
          </g>
        ))}

        {/* Commentaires */}
        {comments.map((comment, i) => {
          const { fontSize, isBold, isItalic, cleanLabel, lines } = commentLayouts[i]
          const isColumnLabel = comment.isColumnLabel === true
          const isHovered = hoveredComment === i
          const hoveredAppNode = hoveredApp != null ? appByName.get(hoveredApp) : undefined
          const isHighlighted = isColumnLabel || isHovered
            || (hoveredAppNode != null && isCommentNearApp(comment, hoveredAppNode))

          const padding = 8
          const lineHeight = fontSize * 1.3

          return (
            <g
              key={`comment-${i}`}
              className={`plan-comment ${isHighlighted ? 'plan-comment--highlighted' : ''}`}
              style={{ cursor: 'default' }}
            >
              {isColumnLabel ? (() => {
                const matchingCol = columns.reduce<Column | null>((best, col) => {
                  if (!best) return col
                  return Math.abs(comment.x - col.x) < Math.abs(comment.x - best.x) ? col : best
                }, null)
                const colColor = matchingCol?.color ?? '#6b7280'
                const colX = matchingCol?.x ?? comment.x
                const colWidth = matchingCol?.width ?? comment.width
                const gradId = `colgrad-${i}`
                const headerH = Math.max(comment.height + 6, 36)
                return (
                  <>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colColor} stopOpacity={isDark ? '0.22' : '0.16'} />
                        <stop offset="100%" stopColor={colColor} stopOpacity={isDark ? '0.06' : '0.04'} />
                      </linearGradient>
                    </defs>
                    <rect x={colX + 1} y={comment.y} width={Math.max(0, colWidth - 2)} height={headerH} fill={`url(#${gradId})`} />
                    <rect x={colX + 1} y={comment.y + headerH - 3} width={Math.max(0, colWidth - 2)} height={3} fill={colColor} fillOpacity="0.7" />
                    <rect x={colX + 1} y={comment.y} width={3} height={headerH} fill={colColor} fillOpacity="0.8" />
                    {lines.map((line, li) => (
                      <text
                        key={li}
                        x={colX + colWidth / 2}
                        y={comment.y + 8 + (fontSize + 4) + li * lineHeight}
                        textAnchor="middle" fill={colColor} fillOpacity="0.95"
                        fontSize={fontSize + 2} fontWeight="800" letterSpacing="1.5"
                        style={{ userSelect: 'none', textTransform: 'uppercase', pointerEvents: 'none' }}
                      >
                        {line.toUpperCase()}
                      </text>
                    ))}
                  </>
                )
              })() : (
                <>
                  <rect
                    x={comment.x} y={comment.y} width={comment.width} height={comment.height}
                    fill={isDark ? '#1e2433' : '#ffffff'}
                    fillOpacity={isHighlighted ? 0.97 : 0}
                    stroke={isHighlighted ? '#3b82f6' : (isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1')}
                    strokeWidth={isHighlighted ? '2' : '1'}
                    strokeOpacity={isHighlighted ? 0.9 : 0.3}
                    rx="5"
                    style={{
                      filter: isHighlighted ? 'drop-shadow(0 4px 16px rgba(59,130,246,0.35))' : 'none',
                      transition: 'fill-opacity 0.15s, stroke-opacity 0.15s',
                      pointerEvents: 'none',
                    }}
                  />
                  <svg
                    x={comment.x} y={comment.y} width={comment.width} height={comment.height}
                    overflow="hidden" style={{ pointerEvents: 'none' }}
                  >
                    {lines.map((line, li) => (
                      <text
                        key={li}
                        x={padding}
                        y={padding + fontSize + li * lineHeight}
                        fill={isDark ? '#94a3b8' : (comment.foreground === '#000000' ? '#374151' : comment.foreground)}
                        fillOpacity={isHighlighted ? 1 : 0.75}
                        fontSize={fontSize}
                        fontWeight={isBold ? 'bold' : 'normal'}
                        fontStyle={isItalic ? 'italic' : 'normal'}
                        style={{ userSelect: 'none', transition: 'fill-opacity 0.15s' }}
                      >
                        {line}
                      </text>
                    ))}
                  </svg>
                  <rect
                    x={comment.x} y={comment.y} width={comment.width} height={comment.height}
                    fill="transparent" stroke="none"
                    onMouseEnter={() => onCommentMouseEnter(i)}
                    onMouseLeave={onCommentMouseLeave}
                  />
                </>
              )}

              {cleanLabel.length > 0 && <title>{cleanLabel}</title>}
            </g>
          )
        })}

        {/* Calque documentaire (annotations + flèches) */}
        {docLayer && (
          <AnnotationLayer
            annotations={docLayer.annotations}
            arrows={docLayer.arrows}
            appByName={appByName}
            editMode={docLayer.editMode}
            tool={docLayer.tool}
            arrowFrom={docLayer.arrowFrom}
            leftOffset={leftOffset}
            svgRef={svgRef}
            onMoveAnnotation={docLayer.onMoveAnnotation}
            onEditAnnotation={docLayer.onEditAnnotation}
            onDeleteAnnotation={docLayer.onDeleteAnnotation}
            onAnnotationClick={docLayer.onAnnotationClick}
          />
        )}
      </g>
    </svg>
  )
}
