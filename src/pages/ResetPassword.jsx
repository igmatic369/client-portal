import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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
    boxSizing: 'border-box',
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
    transition: 'background 0.15s',
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
  waiting: {
    fontSize: '14px',
    color: '#78716c',
    textAlign: 'center',
    padding: '8px 0',
  },
}

export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword })
    setSubmitting(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/login', { replace: true }), 3000)
  }

  const inputStyle = (field) => ({
    ...s.input,
    borderColor: focusedField === field ? '#ea580c' : '#e7e5e4',
  })

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.logoMark}>N</div>
          <div>
            <div style={s.logoText}>NoWebsiteLeads</div>
            <div style={s.logoSub}>Client Portal</div>
          </div>
        </div>

        <h1 style={s.heading}>Set new password</h1>
        <p style={s.subheading}>Choose a new password for your account</p>

        {error && <div style={s.error}>{error}</div>}
        {success && (
          <div style={s.success}>Password updated! Redirecting to login…</div>
        )}

        {!ready && !success && (
          <p style={s.waiting}>Verifying your reset link…</p>
        )}

        {ready && !success && (
          <form onSubmit={handleSubmit}>
            <label style={s.label} htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onFocus={() => setFocusedField('new')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('new')}
              placeholder="At least 8 characters"
            />

            <label style={s.label} htmlFor="confirm-password">Confirm Password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
              style={inputStyle('confirm')}
              placeholder="Repeat your new password"
            />

            <button
              type="submit"
              style={{ ...s.btnPrimary, opacity: submitting ? 0.7 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              disabled={submitting}
            >
              {submitting ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
