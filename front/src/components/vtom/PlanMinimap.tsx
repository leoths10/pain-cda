import type { RefObject } from 'react'
import type { ApplicationNode, TrafficLight, Column, Separator, ViewBox } from '../../types/vtom'
import { softenColor } from '../../utils/vtomColors'

interface Props {
  applications: ApplicationNode[]
  trafficLights: TrafficLight[]
  columns: Column[]
  separators: Separator[]
  scale: number
  viewBox: ViewBox
  isDark: boolean
  isMinimapDragging: boolean
  minimapRef: RefObject<SVGSVGElement | null>
  onMinimapClick: (e: React.MouseEvent<SVGSVGElement>) => void
  onMinimapMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  onMinimapMouseUp: () => void
  onMinimapViewportMouseDown: (e: React.MouseEvent) => void
}

/** Minimap de navigation (vue d'ensemble + viewport déplaçable). */
export function PlanMinimap({
  applications, trafficLights, columns, separators,
  scale, viewBox, isDark, isMinimapDragging, minimapRef,
  onMinimapClick, onMinimapMouseMove, onMinimapMouseUp, onMinimapViewportMouseDown,
}: Props) {
  if (applications.length === 0) return null

  const allXLeft = [...applications.map(a => a.x), ...columns.map(c => c.x)]
  const rawMinX = Math.min(...allXLeft)
  const leftOffset = 40 - rawMinX

  const contentMinX = rawMinX + leftOffset - 20
  const contentMaxX = Math.max(...applications.map(a => a.x + a.width)) + leftOffset + 60
  const contentMaxY = Math.max(...applications.map(a => a.y + 55)) + 80

  const vbW = contentMaxX - contentMinX
  const vbH = contentMaxY

  return (
    <div className="vtom-plan-minimap">
      <div className="minimap-header">
        <span className="minimap-title">Vue d'ensemble</span>
        <span className="minimap-zoom-label">{Math.round(scale * 100)}%</span>
      </div>
      <svg
        ref={minimapRef}
        viewBox={`${contentMinX} 0 ${vbW} ${vbH}`}
        className="minimap-svg"
        preserveAspectRatio="xMidYMid meet"
        onClick={onMinimapClick}
        onMouseMove={onMinimapMouseMove}
        onMouseUp={onMinimapMouseUp}
        onMouseLeave={onMinimapMouseUp}
        style={{ cursor: isMinimapDragging ? 'grabbing' : 'pointer' }}
      >
        <rect
          x={contentMinX} y={0} width={vbW} height={vbH}
          fill={isDark ? '#161b27' : '#f3f4f6'}
        />

        {columns.map((col, i) => (
          <rect
            key={`mini-col-${i}`}
            x={col.x + leftOffset} y={0} width={col.width} height={vbH}
            fill={col.color} fillOpacity="0.15"
          />
        ))}

        {separators.filter(s => !s.isVertical && s.width > 0).map((s, i) => (
          <rect
            key={`mini-sep-${i}`}
            x={s.x + leftOffset} y={s.y + s.height / 2 - 1}
            width={s.width} height={2}
            fill={isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}
          />
        ))}

        {applications.map((app, i) => (
          <rect
            key={`mini-app-${i}`}
            x={app.x + leftOffset} y={app.y} width={app.width} height={55}
            fill={softenColor(app.background)} rx="2" opacity="0.9"
          />
        ))}

        {trafficLights.map((light, i) => (
          <rect
            key={`mini-light-${i}`}
            x={light.x + leftOffset} y={light.y}
            width={Math.max(light.width, 20)} height={Math.max(light.height, 20)}
            fill="#ff4444" opacity="0.7" rx="2"
          />
        ))}

        {/* Rectangle de viewport */}
        <rect
          x={viewBox.x + leftOffset} y={viewBox.y}
          width={viewBox.width} height={viewBox.height}
          fill="rgba(99,102,241,0.08)"
          stroke="#6366f1"
          strokeWidth={Math.max(4, vbW / 60)}
          rx="3"
          onMouseDown={onMinimapViewportMouseDown}
          style={{ cursor: 'grab' }}
        />
      </svg>
    </div>
  )
}
