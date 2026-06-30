import { useEffect, useState } from 'react'
import type { ApplicationNode } from '../../types/vtom'
import type { DocAnnotation, DocArrow } from '../../types/planDoc'
import type { EditTool } from '../../hooks/usePlanDocs'
import { clipToRect, wrapText } from '../../utils/vtomHelpers'

const APP_H = 55
const FONT_SIZE = 12

interface Props {
  annotations: DocAnnotation[]
  arrows: DocArrow[]
  appByName: Map<string, ApplicationNode>
  editMode: boolean
  tool: EditTool
  arrowFrom: string | null
  leftOffset: number
  svgRef: React.RefObject<SVGSVGElement | null>
  onMoveAnnotation: (uid: string, x: number, y: number) => void
  onEditAnnotation: (uid: string) => void
  onDeleteAnnotation: (uid: string) => void
  onAnnotationClick: (uid: string) => void
}

interface DragState {
  uid: string
  offsetX: number
  offsetY: number
}

/**
 * Calque d'annotation rendu DANS le groupe translaté du plan (mêmes coordonnées
 * que les applications). Affiche les flèches puis les encadrés d'annotation, et
 * gère en mode édition le déplacement (drag), l'édition de texte et la suppression.
 */
export function AnnotationLayer({
  annotations, arrows, appByName, editMode, tool, arrowFrom,
  leftOffset, svgRef,
  onMoveAnnotation, onEditAnnotation, onDeleteAnnotation, onAnnotationClick,
}: Props) {
  const [drag, setDrag] = useState<DragState | null>(null)

  /** Convertit des coordonnées écran en coordonnées du groupe (repère du plan). */
  const clientToGroup = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current
    if (!svg) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return null
    const p = pt.matrixTransform(ctm.inverse())
    return { x: p.x - leftOffset, y: p.y }
  }

  // Déplacement d'une annotation via listeners globaux (suivi hors du SVG).
  useEffect(() => {
    if (!drag) return
    const onMove = (e: MouseEvent) => {
      const g = clientToGroup(e.clientX, e.clientY)
      if (g) onMoveAnnotation(drag.uid, g.x - drag.offsetX, g.y - drag.offsetY)
    }
    const onUp = () => setDrag(null)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])

  const byUid = new Map(annotations.map(a => [a.uid, a]))

  const startDrag = (a: DocAnnotation, e: React.MouseEvent) => {
    if (!editMode || tool !== 'select') return
    e.stopPropagation()
    const g = clientToGroup(e.clientX, e.clientY)
    if (!g) return
    setDrag({ uid: a.uid, offsetX: g.x - a.x, offsetY: g.y - a.y })
  }

  return (
    <g className="annotation-layer">
      {/* Flèches (rendues sous les encadrés) */}
      {arrows.map((arrow, i) => {
        const src = byUid.get(arrow.from_uid)
        if (!src) return null

        let tx: number, ty: number, tw: number, th: number
        if (arrow.target_type === 'app') {
          const app = appByName.get(arrow.target_ref)
          if (!app) return null
          tx = app.x; ty = app.y; tw = app.width; th = APP_H
        } else if (arrow.target_type === 'annotation') {
          const tgt = byUid.get(arrow.target_ref)
          if (!tgt) return null
          tx = tgt.x; ty = tgt.y; tw = tgt.width; th = tgt.height
        } else {
          return null
        }

        const srcCx = src.x + src.width / 2
        const srcCy = src.y + src.height / 2
        const tgtCx = tx + tw / 2
        const tgtCy = ty + th / 2
        const [x1, y1] = clipToRect(tgtCx, tgtCy, src.x, src.y, src.width, src.height)
        const [x2, y2] = clipToRect(srcCx, srcCy, tx, ty, tw, th)
        const markerId = `doc-arrow-${i}`

        return (
          <g key={`doc-arrow-${i}`} style={{ pointerEvents: 'none' }}>
            <defs>
              <marker
                id={markerId} markerWidth="9" markerHeight="9"
                refX="7" refY="4.5" orient="auto" markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,9 L9,4.5 z" fill={arrow.color} />
              </marker>
            </defs>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={arrow.color} strokeWidth="2.5" strokeOpacity="0.9"
              markerEnd={`url(#${markerId})`}
            />
          </g>
        )
      })}

      {/* Encadrés d'annotation (rendus au-dessus des flèches) */}
      {annotations.map(a => {
        const lines = wrapText(a.text, Math.max(6, Math.floor(a.width / (FONT_SIZE * 0.55))))
        const isArrowSource = arrowFrom === a.uid
        const interactive = editMode

        return (
          <g
            key={a.uid}
            style={{
              cursor: editMode ? (tool === 'select' ? 'move' : 'pointer') : 'default',
              pointerEvents: interactive ? 'auto' : 'none',
            }}
            onMouseDown={e => startDrag(a, e)}
            onClick={e => {
              if (!editMode) return
              e.stopPropagation()
              if (tool === 'arrow') onAnnotationClick(a.uid)
            }}
            onDoubleClick={e => {
              if (!editMode) return
              e.stopPropagation()
              onEditAnnotation(a.uid)
            }}
          >
            <rect
              x={a.x} y={a.y} width={a.width} height={a.height}
              rx="8"
              fill={a.color} fillOpacity="0.18"
              stroke={a.color}
              strokeWidth={isArrowSource ? 3 : 2}
              strokeDasharray={isArrowSource ? '6 4' : undefined}
            />
            <svg x={a.x} y={a.y} width={a.width} height={a.height} overflow="hidden" style={{ pointerEvents: 'none' }}>
              {lines.map((line, li) => (
                <text
                  key={li}
                  x={10}
                  y={8 + FONT_SIZE + li * (FONT_SIZE * 1.3)}
                  fontSize={FONT_SIZE} fontWeight="600"
                  fill="#7c5e10"
                >
                  {line}
                </text>
              ))}
            </svg>

            {editMode && (
              <g
                style={{ cursor: 'pointer' }}
                onClick={e => { e.stopPropagation(); onDeleteAnnotation(a.uid) }}
              >
                <circle cx={a.x + a.width - 10} cy={a.y + 10} r="9" fill="#ef4444" />
                <text
                  x={a.x + a.width - 10} y={a.y + 14}
                  textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  ×
                </text>
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}
