import { useCallback, useEffect, useRef, useState } from 'react'
import type { ViewBox } from '../types/vtom'

const INITIAL_SCALE = 1
const INITIAL_VIEWBOX: ViewBox = { x: 0, y: 0, width: 3000, height: 7000 }
const MIN_SCALE = 0.3
const MAX_SCALE = 2
const CANVAS_W = 3000
const CANVAS_H = 7000

/**
 * Gère le viewport du plan VTOM : zoom, pan (clic-glissé sur le fond),
 * mode plein écran, et raccourcis clavier (+/-/0).
 */
export function useVtomViewport() {
  const [scale, setScale] = useState(INITIAL_SCALE)
  const [viewBox, setViewBox] = useState<ViewBox>(INITIAL_VIEWBOX)
  const [isPanning, setIsPanning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // ─── Zoom ────────────────────────────────────────────────────────────────

  const applyZoom = useCallback((newScale: number) => {
    if (newScale === scale) return
    const container = scrollContainerRef.current
    if (!container) { setScale(newScale); return }

    // Garde le centre actuel du viewport visible après le zoom
    const centerX = (container.scrollLeft + container.clientWidth / 2) / (CANVAS_W * scale) * CANVAS_W
    const centerY = (container.scrollTop + container.clientHeight / 2) / (CANVAS_H * scale) * CANVAS_H

    setScale(newScale)
    requestAnimationFrame(() => {
      container.scrollLeft = (centerX / CANVAS_W) * (CANVAS_W * newScale) - container.clientWidth / 2
      container.scrollTop = (centerY / CANVAS_H) * (CANVAS_H * newScale) - container.clientHeight / 2
    })
  }, [scale])

  const zoomBy = useCallback((delta: number) => {
    applyZoom(Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta)))
  }, [applyZoom, scale])

  const zoomTo = useCallback((targetScale: number) => {
    applyZoom(Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale)))
  }, [applyZoom])

  const zoomReset = useCallback(() => {
    setScale(INITIAL_SCALE)
    setViewBox(INITIAL_VIEWBOX)
    requestAnimationFrame(() => {
      const c = scrollContainerRef.current
      if (c) { c.scrollLeft = 0; c.scrollTop = 0 }
    })
  }, [])

  // ─── Pan ─────────────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const isMiddle = e.button === 1
    const isLeftOnEmpty = e.button === 0 && !(e.target as HTMLElement).closest('.app-node')
    if (!isMiddle && !isLeftOnEmpty) return
    e.preventDefault()
    setIsPanning(true)
    panStartRef.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning) return
    const container = scrollContainerRef.current
    if (container) {
      container.scrollLeft -= e.clientX - panStartRef.current.x
      container.scrollTop -= e.clientY - panStartRef.current.y
    }
    panStartRef.current = { x: e.clientX, y: e.clientY }
  }, [isPanning])

  const onMouseUp = useCallback(() => setIsPanning(false), [])

  // ─── Scroll → viewBox sync ───────────────────────────────────────────────

  const onScroll = useCallback(() => {
    const c = scrollContainerRef.current
    if (!c) return
    setViewBox(prev => ({
      ...prev,
      x: (c.scrollLeft / (CANVAS_W * scale)) * CANVAS_W,
      y: (c.scrollTop / (CANVAS_H * scale)) * CANVAS_H,
    }))
  }, [scale])

  /** Centre la vue sur une position SVG donnée. */
  const scrollToSvgPoint = useCallback((svgX: number, svgY: number) => {
    const c = scrollContainerRef.current
    if (!c) return
    c.scrollLeft = svgX * scale - c.clientWidth / 2
    c.scrollTop = svgY * scale - c.clientHeight / 2
  }, [scale])

  // ─── Fullscreen ──────────────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    const next = !isFullscreen
    setIsFullscreen(next)
    setScale(next ? 0.8 : INITIAL_SCALE)
    if (!next) setViewBox(INITIAL_VIEWBOX)
    requestAnimationFrame(() => {
      const c = scrollContainerRef.current
      if (c) { c.scrollLeft = 0; c.scrollTop = 0 }
    })
  }, [isFullscreen])

  // ─── Raccourcis clavier ──────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) { setIsFullscreen(false); return }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomBy(0.1) }
      else if (e.key === '-') { e.preventDefault(); zoomBy(-0.1) }
      else if (e.key === '0') { e.preventDefault(); zoomReset() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen, zoomBy, zoomReset])

  return {
    scale, viewBox, isPanning, isFullscreen,
    scrollContainerRef,
    zoomBy, zoomTo, zoomReset,
    onMouseDown, onMouseMove, onMouseUp, onScroll,
    scrollToSvgPoint, toggleFullscreen,
  }
}
