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

/**
 * Admin-only route guard.
 * Checks user_metadata.role or app_metadata.role for "admin".
 * Set this when creating your own account in Supabase:
 *   UPDATE auth.users SET raw_user_meta_data = '{"role":"admin"}' WHERE email = 'you@example.com';
 */
export default function AdminRoute({ children }) {
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

  const isAdmin =
    user?.user_metadata?.role === 'admin' ||
    user?.app_metadata?.role === 'admin'

  if (!isAdmin) return <Navigate to="/" replace />

  return children
}
