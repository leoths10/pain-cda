export function PlanLegend() {
  return (
    <section className="vtom-plan-legend-external" aria-label="Légende du plan">
      <div className="vtom-plan-legend-external__head">
        <span className="vtom-plan-legend-external__dot" aria-hidden="true" />
        <h4>Légende</h4>
      </div>

      <div className="legend-sections-grid">
        <div className="legend-section">
          <p className="legend-section-title">Éléments</p>
          <div className="legend-item">
            <span className="legend-icon legend-icon--indigo" aria-hidden="true">📦</span>
            Applications
          </div>
          <div className="legend-item">
            <span className="legend-icon legend-icon--red" aria-hidden="true">🚦</span>
            Points de contrôle
          </div>
          <div className="legend-item">
            <span className="legend-icon legend-icon--amber" aria-hidden="true">💬</span>
            Commentaires
          </div>
        </div>

        <div className="legend-section">
          <p className="legend-section-title">Statuts</p>
          <div className="legend-item">
            <span className="legend-dot legend-dot--green" aria-hidden="true" />
            Terminé
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--amber" aria-hidden="true" />
            En attente
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--blue" aria-hidden="true" />
            En cours
          </div>
          <div className="legend-item">
            <span className="legend-dot legend-dot--grey" aria-hidden="true" />
            Inconnu
          </div>
        </div>

        <div className="legend-section">
          <p className="legend-section-title">Liens</p>
          <div className="legend-item">
            <svg width="36" height="8" className="legend-line" aria-hidden="true">
              <defs>
                <linearGradient id="legend-link-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
              <line x1="2" y1="4" x2="34" y2="4" stroke="url(#legend-link-gradient)" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Dépendance entre applications
          </div>
        </div>
      </div>
    </section>
  )
}
