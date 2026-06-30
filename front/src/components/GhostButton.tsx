// Bouton générique utilisé dans le Hero, la Minimap et les barres d'outils.
// Supporte deux variantes (outline / primary / danger) et le mode icône seul (hideLabel).
import type { ReactNode } from 'react'

interface GhostButtonProps {
  label: string
  ariaLabel: string
  icon?: ReactNode
  variant?: 'primary' | 'outline' | 'danger'
  isActive?: boolean
  ariaPressed?: boolean
  /** Masque le label visuellement mais le garde pour les lecteurs d'écran. */
  hideLabel?: boolean
  onClick?: () => void
}

function GhostButton({
  label, ariaLabel, icon, variant = 'outline',
  isActive = false, ariaPressed, hideLabel = false, onClick,
}: GhostButtonProps) {
  return (
    <button
      type="button"
      className={`ghost-btn ghost-btn--${variant}${isActive ? ' ghost-btn--active' : ''}`}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-pressed={ariaPressed}
      aria-label={hideLabel ? ariaLabel : undefined}
    >
      {icon && (
        <span role="img" aria-label={ariaLabel} aria-hidden={hideLabel || undefined}>
          {icon}
        </span>
      )}
      {hideLabel ? <span className="sr-only">{label}</span> : label}
    </button>
  )
}

export default GhostButton
