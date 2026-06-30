// Page d'accueil : tableau de bord avec trois cards de navigation (Plan, Documentation, Recherche).
import { useNavigate } from 'react-router-dom'

interface HomeProps {
  onOpenSearch?: () => void
}

interface DashboardCard {
  id: string
  eyebrow: string
  title: string
  description: string
  icon: string
  badge: string
  gradient: string
  to?: string
  intent?: 'search'
}

// Déclaration statique des cards ; ajouter ici pour étendre le tableau de bord.
const DASHBOARD_CARDS: DashboardCard[] = [
  {
    id: 'vtom-plan',
    eyebrow: 'Visualisation interactive',
    title: 'Plan XML VTOM',
    description:
      'Explorez le plan avec zoom, navigation par domaine, visualisation des dépendances et analyse détaillée des traitements.',
    icon: '🗺️',
    badge: 'Plan complet',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    to: '/vtom-plan',
  },
  {
    id: 'documentation',
    eyebrow: 'Guides & références',
    title: 'Documentation',
    description:
      'Guides utilisateur et développeur : procédures, architecture, exploitation et maintenance du plan VTOM.',
    icon: '📘',
    badge: 'Guides',
    gradient: 'linear-gradient(135deg, #000091 0%, #6A6AF4 100%)',
    to: '/documentation',
  },
  {
    id: 'search',
    eyebrow: 'Recherche avancée',
    title: 'Rechercher',
    description:
      'Localisez une application ou un traitement en quelques secondes dans l\'ensemble du plan VTOM.',
    icon: '🔍',
    badge: 'Accès rapide',
    gradient: 'linear-gradient(135deg, #4d0812 0%, #8b1220 60%, #b51828 100%)',
    intent: 'search',
  },
]

function Home({ onOpenSearch }: HomeProps) {
  const navigate = useNavigate()

  function handleCardClick(card: DashboardCard) {
    if (card.intent === 'search') {
      onOpenSearch?.()
    } else if (card.to) {
      navigate(card.to)
    }
  }

  return (
    <>
      <header className="home-header">
        <p className="home-header__eyebrow">Tableau de bord</p>
        <h2>Bienvenue sur le plan VTOM</h2>
        <p className="home-header__subtitle">
          Accédez aux outils de visualisation, à la documentation et à la recherche d'applications.
        </p>
      </header>

      <section className="dashboard" aria-label="Navigation principale">
        <div className="dashboard__grid">
          {DASHBOARD_CARDS.map((card, i) => (
            <button
              key={card.id}
              type="button"
              className="dashboard-card"
              style={{
                background: card.gradient,
                animationDelay: `${i * 0.1}s`,
              }}
              onClick={() => handleCardClick(card)}
              aria-label={card.title}
            >
              <span className="dashboard-card__badge">{card.badge}</span>
              <span className="dashboard-card__icon" aria-hidden="true">{card.icon}</span>
              <p className="dashboard-card__eyebrow">{card.eyebrow}</p>
              <h3 className="dashboard-card__title">{card.title}</h3>
              <p className="dashboard-card__description">{card.description}</p>
              <span className="dashboard-card__arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </section>
    </>
  )
}

export default Home
