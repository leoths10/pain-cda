import { useCallback, useEffect, useRef, useState } from 'react'
import type { ApplicationNode } from '../types/vtom'

const OPEN_DELAY_MS = 1200
const CLOSE_DELAY_MS = 120

/**
 * Gère le tooltip au survol des applications : ouverture différée après 1,2 s,
 * fermeture avec un délai court pour permettre le survol du tooltip lui-même.
 */
export function useVtomTooltip() {
  const [tooltipApp, setTooltipApp] = useState<ApplicationNode | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHoveredRef = useRef(false)

  const clearTimer = (ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (ref.current) { clearTimeout(ref.current); ref.current = null }
  }

  const onAppMouseEnter = useCallback((app: ApplicationNode, e: React.MouseEvent<SVGGElement>) => {
    clearTimer(closeTimerRef)
    const rect = e.currentTarget.getBoundingClientRect()
    openTimerRef.current = setTimeout(() => {
      setTooltipApp(app)
      setTooltipPos({ x: rect.right + 10, y: rect.top })
    }, OPEN_DELAY_MS)
  }, [])

  const onAppMouseLeave = useCallback(() => {
    clearTimer(openTimerRef)
    closeTimerRef.current = setTimeout(() => {
      if (!isHoveredRef.current) setTooltipApp(null)
    }, CLOSE_DELAY_MS)
  }, [])

  const onTooltipMouseEnter = useCallback(() => {
    isHoveredRef.current = true
    clearTimer(closeTimerRef)
  }, [])

  const onTooltipMouseLeave = useCallback(() => {
    isHoveredRef.current = false
    setTooltipApp(null)
  }, [])

  useEffect(() => {
    return () => {
      clearTimer(openTimerRef)
      clearTimer(closeTimerRef)
    }
  }, [])

  return {
    tooltipApp, tooltipPos,
    onAppMouseEnter, onAppMouseLeave,
    onTooltipMouseEnter, onTooltipMouseLeave,
  }
}
