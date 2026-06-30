import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeProvider'
import ThemeToggleButton from './ThemeToggleButton'
import logo from '../data/logo-vtom.png'
import '../styles/Login.css'

function Login() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [identifiant, setIdentifiant] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Déjà authentifié → accueil
  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!identifiant.trim() || !motDePasse) {
      setError('Veuillez renseigner tous les champs.')
      return
    }

    setSubmitting(true)
    try {
      await login(identifiant.trim(), motDePasse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`login-page ${isDark ? 'login-page--dark' : ''}`}>
      <div className="login-theme-toggle">
        <ThemeToggleButton />
      </div>

      <div className="login-card">
        <div className="login-card__header">
          <div className="login-card__logo">
            <img src={logo} alt="Logo VTOM" />
          </div>
          <div className="login-card__titles">
            <span className="login-card__eyebrow">Ministère des Finances</span>
            <h1 className="login-card__title">PAIN</h1>
            <p className="login-card__subtitle">PAysageINformation</p>
          </div>
        </div>

        <div className="login-tricolor" aria-hidden="true">
          <span className="login-tricolor__bleu" />
          <span className="login-tricolor__blanc" />
          <span className="login-tricolor__rouge" />
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <h2 className="login-form__title">Connexion</h2>

          <div className="login-field">
            <label htmlFor="identifiant" className="login-field__label">
              Identifiant
            </label>
            <input
              id="identifiant"
              type="text"
              className="login-field__input"
              value={identifiant}
              onChange={e => { setIdentifiant(e.target.value); setError(null) }}
              placeholder="Votre identifiant agent"
              autoComplete="username"
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="login-field">
            <label htmlFor="mot-de-passe" className="login-field__label">
              Mot de passe
            </label>
            <div className="login-field__password-wrap">
              <input
                id="mot-de-passe"
                type={showPassword ? 'text' : 'password'}
                className="login-field__input"
                value={motDePasse}
                onChange={e => { setMotDePasse(e.target.value); setError(null) }}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={submitting}
              />
              <button
                type="button"
                className="login-field__eye"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <span aria-hidden="true">⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={submitting}
          >
            {submitting && <span className="login-submit__spinner" aria-hidden="true" />}
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="login-card__footer">
          Accès réservé aux agents habilités — Usage interne uniquement
        </p>
      </div>
    </div>
  )
}

export default Login
