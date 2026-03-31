import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f5f5f4',
    padding: '24px',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06)',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '28px',
  },
  logoMark: {
    width: '36px',
    height: '36px',
    background: '#ea580c',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '18px',
    fontWeight: 700,
  },
  logoText: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1c1917',
    lineHeight: 1.2,
  },
  logoSub: {
    fontSize: '12px',
    color: '#78716c',
    fontWeight: 400,
  },
  heading: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1c1917',
    marginBottom: '6px',
  },
  subheading: {
    fontSize: '14px',
    color: '#78716c',
    marginBottom: '28px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#44403c',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1.5px solid #e7e5e4',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1c1917',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.15s',
    marginBottom: '16px',
  },
  inputFocus: {
    borderColor: '#ea580c',
  },
  btnPrimary: {
    width: '100%',
    padding: '11px',
    background: '#ea580c',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'background 0.15s',
  },
  btnGoogle: {
    width: '100%',
    padding: '11px',
    background: '#fff',
    color: '#1c1917',
    border: '1.5px solid #e7e5e4',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.15s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
    color: '#a8a29e',
    fontSize: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: '#e7e5e4',
  },
  forgotRow: {
    textAlign: 'right',
    marginBottom: '20px',
    marginTop: '-8px',
  },
  forgotLink: {
    fontSize: '13px',
    color: '#ea580c',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  success: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#16a34a',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '13px',
    marginBottom: '16px',
  },
}

export default function Login() {
  const { login, loginWithGoogle, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await login(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate('/', { replace: true })
  }

  const handleGoogle = async () => {
    setError('')
    const { error } = await loginWithGoogle()
    if (error) setError(error.message)
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email address above, then click "Forgot password?"')
      return
    }
    setError('')
    setLoading(true)

    const { error } = await resetPassword(email)
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setResetSent(true)
    }
  }

  const inputStyle = (field) => ({
    ...s.input,
    ...(focusedField === field ? s.inputFocus : {}),
  })

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logo}>
          <div style={s.logoMark}>N</div>
          <div>
            <div style={s.logoText}>NoWebsiteLeads</div>
            <div style={s.logoSub}>Client Portal</div>
          </div>
        </div>

        <h1 style={s.heading}>Welcome back</h1>
        <p style={s.subheading}>Sign in to manage your website</p>

        {/* Error / success messages */}
        {error && <div style={s.error}>{error}</div>}
        {resetSent && (
          <div style={s.success}>
            Password reset email sent! Check your inbox for a link to set a new password.
          </div>
        )}

        {/* Email + password form */}
        <form onSubmit={handleLogin}>
          <label style={s.label} htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            style={inputStyle('email')}
            placeholder="you@example.com"
          />

          <label style={s.label} htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            style={inputStyle('password')}
            placeholder="••••••••"
          />

          <div style={s.forgotRow}>
            <button type="button" style={s.forgotLink} onClick={handleForgotPassword}>
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span>or</span>
          <div style={s.dividerLine} />
        </div>

        {/* Google OAuth */}
        <button style={s.btnGoogle} onClick={handleGoogle} type="button">
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
