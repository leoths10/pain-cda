// Bouton bascule clair/sombre : wrapper de GhostButton branché sur ThemeProvider.
import GhostButton from './GhostButton'
import { useTheme } from '../contexts/ThemeProvider'

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Activer le mode clair' : 'Activer le mode sombre'

  return (
    <GhostButton
      icon={isDark ? '☀️' : '🌙'}
      label={label}
      ariaLabel={label}
      ariaPressed={!isDark}
      hideLabel
      onClick={toggleTheme}
    />
  )
}

export default ThemeToggleButton
