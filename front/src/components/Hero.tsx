// Bandeau de navigation persistant en haut de chaque page protégée.
// Affiche le logo, le titre du site et les boutons de navigation issus de plan-data.json.
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import GhostButton from './GhostButton'
import ThemeToggleButton from './ThemeToggleButton'
import { useAuth } from '../contexts/AuthContext'
import type { HeroContent } from '../types'
import logo from '../data/logo-vtom.png'

interface HeroProps {
  content: HeroContent
  /** Chemin actuel utilisé pour mettre en surbrillance le bouton actif. */
  activePath: string
}

function Hero({ content, activePath }: HeroProps) {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [showConfirm, setShowConfirm] = useState(false)

  const confirmLogout = async () => {
    setShowConfirm(false)
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="hero">
        <div className="hero__body">
          <div className="hero__main">
            <div className="hero__icon hero__icon--image" aria-label={content.icon.label} role="img">
              <img src={logo} alt={content.icon.label} />
            </div>
            <div>
              <p className="hero__eyebrow">{content.eyebrow}</p>
              <h1>{content.title}</h1>
              <p className="hero__subtitle">{content.subtitle}</p>
            </div>
          </div>

          <div className="hero__actions">
            {content.actions.map(action => (
              <GhostButton
                key={action.label}
                {...action}
                isActive={action.path === activePath}
                onClick={() => navigate(action.path)}
              />
            ))}
            <ThemeToggleButton />
            <GhostButton
              label={user?.uid ?? 'Déconnexion'}
              ariaLabel="Se déconnecter"
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              }
              variant="danger"
              onClick={() => setShowConfirm(true)}
            />
          </div>
        </div>
      </header>

      {showConfirm && createPortal(
        <div
          style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowConfirm(false)}
        >
          <div className="vtom-modal logout-confirm" role="dialog" aria-modal="true" aria-labelledby="logout-title" onClick={e => e.stopPropagation()}>
            <p id="logout-title">Voulez-vous vraiment vous déconnecter ?</p>
            <div className="logout-confirm__actions">
              <GhostButton label="Annuler" ariaLabel="Annuler" variant="outline" onClick={() => setShowConfirm(false)} />
              <GhostButton label="Se déconnecter" ariaLabel="Confirmer la déconnexion" variant="danger" onClick={confirmLogout} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default Hero
