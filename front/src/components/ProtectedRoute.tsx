import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.9rem',
        gap: '0.75rem',
      }}>
        <span style={{
          width: '1.1rem',
          height: '1.1rem',
          border: '2px solid rgba(255,255,255,0.2)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'loginSpin 0.7s linear infinite',
        }} />
        Vérification de la session…
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
