// Bandeau RGPD affiché au premier chargement si aucun consentement n'est enregistré.
// Le choix est persisté 365 jours via cookie ; seules les préférences de thème sont stockées.
import { useEffect, useState } from 'react'
import { getUserPreference, setUserPreference } from '../utils/cookies'
import GhostButton from './GhostButton'

function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (getUserPreference('cookie_consent')) return
    // Léger délai pour éviter un flash à l'ouverture
    const timer = setTimeout(() => setIsVisible(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleChoice = (choice: 'accepted' | 'declined') => {
    setUserPreference('cookie_consent', choice, 365)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="cookie-consent">
      <div className="cookie-consent__content">
        <div className="cookie-consent__text">
          <h3 className="cookie-consent__title">🍪 Utilisation des cookies</h3>
          <p className="cookie-consent__description">
            Ce site utilise des cookies pour sauvegarder vos préférences (thème clair/sombre)
            et améliorer votre expérience. Aucune donnée personnelle n'est collectée.
          </p>
        </div>
        <div className="cookie-consent__actions">
          <GhostButton
            label="Accepter"
            ariaLabel="Accepter l'utilisation des cookies"
            icon="✓"
            variant="primary"
            onClick={() => handleChoice('accepted')}
          />
          <GhostButton
            label="Refuser"
            ariaLabel="Refuser l'utilisation des cookies"
            icon="✗"
            variant="outline"
            onClick={() => handleChoice('declined')}
          />
        </div>
      </div>
    </div>
  )
}

export default CookieConsent
