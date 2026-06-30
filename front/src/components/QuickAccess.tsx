import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CSSVarProperties, QuickAccessContent, QuickLink } from '../types'

interface QuickAccessProps extends QuickAccessContent {
  onOpenSearch?: () => void
}

function QuickAccess({ eyebrow, title, links, onOpenSearch }: QuickAccessProps) {
  const navigate = useNavigate()

  const handleLinkClick = useCallback((link: QuickLink) => {
    if (link.intent === 'search') {
      onOpenSearch?.()
      return
    }
    if (link.to) navigate(link.to)
  }, [navigate, onOpenSearch])

  return (
    <section className="quick-access">
      <div className="quick-access__header">
        <div>
          <p className="quick-access__eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="quick-access__grid">
        {links.map(link => {
          const accentStyle: CSSVarProperties = { '--accent-color': link.accent }
          return (
            <article key={link.title} className="quick-card" style={accentStyle}>
              <div className="quick-card__body">
                <h3>{link.title}</h3>
                <p>{link.description}</p>
              </div>
              <button type="button" className="quick-card__cta" onClick={() => handleLinkClick(link)}>
                {link.action} →
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default QuickAccess
