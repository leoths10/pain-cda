// Pied de page commun : logo République française, liens de navigation et copyright.
import logoRepublique from '../assets/Logo_de_la_République_française_(1999).svg.png'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="app-footer">
      <div className="app-footer__container">
        <div className="app-footer__main">
          <div className="app-footer__logo-section">
            <img
              src={logoRepublique}
              alt="Logo de la République française"
              className="app-footer__logo"
            />
            <p className="app-footer__motto">Liberté • Égalité • Fraternité</p>
          </div>

          <div className="app-footer__info">
            <div className="app-footer__column">
              <h3 className="app-footer__title">À propos</h3>
              <p className="app-footer__description">
                Site documentaire — Paysage VTOM<br />
                Visualisation des applications, traitements et dépendances
              </p>
            </div>

            <div className="app-footer__column">
              <h3 className="app-footer__title">Navigation</h3>
              <ul className="app-footer__links">
                <li><a href="/">Accueil</a></li>
                <li><a href="/vtom-plan">Plan VTOM</a></li>
                <li><a href="/documentation">Documentation</a></li>
              </ul>
            </div>

            <div className="app-footer__column">
              <h3 className="app-footer__title">Informations</h3>
              <ul className="app-footer__links">
                <li>Version 1.0.0</li>
                <li>Police : Marianne</li>
                <li>React + TypeScript</li>
                <li>Laravel API</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="app-footer__bottom">
          <p className="app-footer__copyright">
            © {currentYear} République Française — Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
