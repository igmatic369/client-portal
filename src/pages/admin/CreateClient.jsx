import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function generatePassword() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((b) => b.toString(36))
    .join('')
    .slice(0, 14)
}

const s = {
  topBar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#78716c', padding: 0 },
  heading: { fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 },
  card: {
    background: '#fff', border: '1.5px solid #e7e5e4',
    borderRadius: '10px', padding: '28px', maxWidth: '500px',
  },
  field: { marginBottom: '18px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: '#44403c', marginBottom: '6px' },
  inputRow: { display: 'flex', gap: '8px' },
  input: {
    flex: 1, padding: '9px 12px', border: '1.5px solid #e7e5e4',
    borderRadius: '7px', fontSize: '14px', color: '#1c1917', outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box', width: '100%',
  },
  regenBtn: {
    background: 'none', border: '1.5px solid #e7e5e4', borderRadius: '7px',
    padding: '9px 12px', fontSize: '13px', color: '#44403c', cursor: 'pointer',
    flexShrink: 0, whiteSpace: 'nowrap',
  },
  hint: { fontSize: '11px', color: '#a8a29e', marginTop: '4px' },
  actions: { display: 'flex', gap: '10px', marginTop: '24px' },
  submitBtn: {
    background: '#ea580c', color: '#fff', border: 'none',
    borderRadius: '7px', padding: '10px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none', border: '1.5px solid #e7e5e4', borderRadius: '7px',
    padding: '10px 18px', fontSize: '14px', color: '#44403c', cursor: 'pointer',
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px',
  },
  successCard: {
    background: '#f0fdf4', border: '1.5px solid #bbf7d0',
    borderRadius: '10px', padding: '24px', maxWidth: '500px',
  },
  successHeading: { fontSize: '16px', fontWeight: 700, color: '#15803d', marginBottom: '12px' },
  credRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' },
  credLabel: { color: '#44403c', fontWeight: 500 },
  credValue: { color: '#1c1917', fontFamily: 'monospace' },
  successActions: { display: 'flex', gap: '10px', marginTop: '20px' },
  anotherBtn: {
    background: 'none', border: '1.5px solid #bbf7d0', borderRadius: '7px',
    padding: '9px 16px', fontSize: '13px', color: '#15803d', cursor: 'pointer',
  },
  sitesBtn: {
    background: '#ea580c', color: '#fff', border: 'none',
    borderRadius: '7px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
}

export default function CreateClient() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: generatePassword(), displayName: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null) // { email, password }

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const { data, error: fnErr } = await supabase.functions.invoke('admin-create-user', {
      body: {
        email: form.email,
        password: form.password,
        displayName: form.displayName || undefined,
      },
    })
    setSubmitting(false)

    if (fnErr || data?.error) {
      setError(data?.error ?? fnErr?.message ?? 'Failed to create user')
      return
    }

    setCreated({ email: form.email, password: form.password })
  }

  const handleCreateAnother = () => {
    setCreated(null)
    setForm({ email: '', password: generatePassword(), displayName: '' })
    setError('')
  }

  if (created) {
    return (
      <div>
        <div style={s.topBar}>
          <button style={s.backBtn} onClick={() => navigate('/admin/clients')}>← Clients</button>
          <h1 style={s.heading}>Client Created</h1>
        </div>
        <div style={s.successCard}>
          <div style={s.successHeading}>✓ Account created — share these credentials</div>
          <div style={s.credRow}>
            <span style={s.credLabel}>Email</span>
            <span style={s.credValue}>{created.email}</span>
          </div>
          <div style={s.credRow}>
            <span style={s.credLabel}>Password</span>
            <span style={s.credValue}>{created.password}</span>
          </div>
          <p style={{ fontSize: '12px', color: '#78716c', marginTop: '12px' }}>
            The client can log in at the portal URL and change their password after first login.
          </p>
          <div style={s.successActions}>
            <button style={s.anotherBtn} onClick={handleCreateAnother}>Create Another</button>
            <button style={s.sitesBtn} onClick={() => navigate('/admin/sites')}>Go to Sites</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={s.topBar}>
        <button style={s.backBtn} onClick={() => navigate('/admin/clients')}>← Clients</button>
        <h1 style={s.heading}>Create New Client</h1>
      </div>

      <div style={s.card}>
        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Email *</label>
            <input
              style={s.input} type="email" required value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="client@example.com"
              onFocus={(e) => e.target.style.borderColor = '#ea580c'}
              onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password *</label>
            <div style={s.inputRow}>
              <input
                style={s.input} type="text" required value={form.password}
                onChange={(e) => set('password', e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#ea580c'}
                onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
              />
              <button type="button" style={s.regenBtn} onClick={() => set('password', generatePassword())}>
                ↻ Regenerate
              </button>
            </div>
            <p style={s.hint}>Auto-generated. You can edit it or regenerate.</p>
          </div>

          <div style={s.field}>
            <label style={s.label}>Display Name <span style={{ color: '#a8a29e', fontWeight: 400 }}>(optional)</span></label>
            <input
              style={s.input} type="text" value={form.displayName}
              onChange={(e) => set('displayName', e.target.value)}
              placeholder="Jane Smith"
              onFocus={(e) => e.target.style.borderColor = '#ea580c'}
              onBlur={(e) => e.target.style.borderColor = '#e7e5e4'}
            />
          </div>

          <div style={s.actions}>
            <button type="submit" disabled={submitting} style={{
              ...s.submitBtn,
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}>
              {submitting ? 'Creating…' : 'Create Client'}
            </button>
            <button type="button" style={s.cancelBtn} onClick={() => navigate('/admin/clients')}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
