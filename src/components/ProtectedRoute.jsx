import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const spinnerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  flexDirection: 'column',
  gap: '12px',
  color: '#78716c',
  fontSize: '14px',
}

const dotStyle = {
  width: '32px',
  height: '32px',
  border: '3px solid #e7e5e4',
  borderTop: '3px solid #ea580c',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
}

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={spinnerStyle}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={dotStyle} />
        <span>Loading…</span>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
