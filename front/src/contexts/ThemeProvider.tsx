// Gestion globale du thème clair/sombre.
// Priorité de lecture au chargement : cookie → localStorage → défaut "light".
// Le thème est synchronisé sur document.documentElement.dataset.theme pour le CSS.
import {
  ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import { getUserPreference, setUserPreference } from '../utils/cookies'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_TRANSITION_MS = 800
const STORAGE_KEY = 'vtom-theme'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const fromCookie = getUserPreference('theme')
  if (fromCookie === 'dark' || fromCookie === 'light') return fromCookie
  const fromStorage = window.localStorage.getItem(STORAGE_KEY)
  if (fromStorage === 'dark' || fromStorage === 'light') return fromStorage
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const transitionTimerRef = useRef<number | null>(null)

  // Ajoute temporairement la classe 'theme-transitioning' pour activer la transition CSS
  const triggerTransition = useCallback(() => {
    const root = document.documentElement
    root.classList.add('theme-transitioning')
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
    transitionTimerRef.current = window.setTimeout(() => {
      root.classList.remove('theme-transitioning')
      transitionTimerRef.current = null
    }, THEME_TRANSITION_MS)
  }, [])

  const toggleTheme = useCallback(() => {
    triggerTransition()
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [triggerTransition])

  // Synchronise DOM + persiste le thème à chaque changement
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(STORAGE_KEY, theme)
    setUserPreference('theme', theme, 365)
  }, [theme])

  useEffect(() => () => {
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current)
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
