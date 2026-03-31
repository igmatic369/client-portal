import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const s = {
  page: {
    minHeight: '100vh',
    background: '#f5f5f4',
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e7e5e4',
    padding: '0 24px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    background: 'none',
    border: '1.5px solid #e7e5e4',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    color: '#44403c',
    cursor: 'pointer',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  siteName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1c1917',
  },
  main: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '60px 24px',
    textAlign: 'center',
  },
  badge: {
    display: 'inline-block',
    background: '#fff7ed',
    color: '#ea580c',
    border: '1px solid #fed7aa',
    borderRadius: '20px',
    padding: '4px 14px',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: '24px',
  },
  heading: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1c1917',
    marginBottom: '12px',
  },
  subheading: {
    fontSize: '16px',
    color: '#78716c',
    lineHeight: 1.6,
    marginBottom: '40px',
    maxWidth: '480px',
    margin: '0 auto 40px',
  },
  card: {
    background: '#fff',
    border: '1px solid #e7e5e4',
    borderRadius: '12px',
    padding: '28px',
    textAlign: 'left',
    maxWidth: '480px',
    margin: '0 auto',
  },
  cardHeading: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#44403c',
    marginBottom: '16px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  phaseList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  phaseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #f5f5f4',
    fontSize: '14px',
    color: '#78716c',
  },
  phaseItemActive: {
    color: '#1c1917',
    fontWeight: 500,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#e7e5e4',
    flexShrink: 0,
  },
  dotActive: {
    background: '#ea580c',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    maxWidth: '480px',
    margin: '0 auto 24px',
  },
}

const phases = [
  { label: 'Phase 1 — Auth & Dashboard', done: true },
  { label: 'Phase 2 — Content Editor', active: true },
  { label: 'Phase 3 — Image Management', done: false },
  { label: 'Phase 4 — Admin Panel', done: false },
  { label: 'Phase 5 — Polish & Hardening', done: false },
]

export default function Editor() {
  const { siteId } = useParams()
  const navigate = useNavigate()

  const [site, setSite] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchSite() {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, netlify_url')
        .eq('id', siteId)
        .single()

      if (error) {
        setError('Site not found or you don\'t have access to it.')
      } else {
        setSite(data)
      }
      setLoading(false)
    }

    fetchSite()
  }, [siteId])

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate('/')}>
          ← Dashboard
        </button>
        {site && <span style={s.siteName}>Editing: {site.name}</span>}
      </header>

      {/* Main */}
      <main style={s.main}>
        {loading ? (
          <p style={{ color: '#78716c', fontSize: '14px' }}>Loading site…</p>
        ) : error ? (
          <div style={s.errorBox}>{error}</div>
        ) : (
          <>
            <div style={s.badge}>Phase 2</div>
            <h1 style={s.heading}>Content editor coming soon</h1>
            <p style={s.subheading}>
              The full schema-driven editor for <strong>{site?.name}</strong> is being built in Phase 2.
              You'll be able to edit all your website content here.
            </p>

            <div style={s.card}>
              <div style={s.cardHeading}>Build progress</div>
              <ul style={s.phaseList}>
                {phases.map((phase) => (
                  <li
                    key={phase.label}
                    style={{
                      ...s.phaseItem,
                      ...(phase.active ? s.phaseItemActive : {}),
                    }}
                  >
                    <div style={{ ...s.dot, ...(phase.done || phase.active ? s.dotActive : {}) }} />
                    {phase.label}
                    {phase.done && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#16a34a' }}>✓ Done</span>}
                    {phase.active && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#ea580c' }}>In progress</span>}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
