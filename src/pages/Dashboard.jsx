import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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
    justifyContent: 'space-between',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoMark: {
    width: '30px',
    height: '30px',
    background: '#ea580c',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 700,
  },
  logoText: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1c1917',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userEmail: {
    fontSize: '13px',
    color: '#78716c',
  },
  logoutBtn: {
    background: 'none',
    border: '1.5px solid #e7e5e4',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    color: '#44403c',
    cursor: 'pointer',
    fontWeight: 500,
  },
  main: {
    maxWidth: '880px',
    margin: '0 auto',
    padding: '40px 24px',
  },
  pageHeading: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1c1917',
    marginBottom: '6px',
  },
  pageSubheading: {
    fontSize: '14px',
    color: '#78716c',
    marginBottom: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '20px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e7e5e4',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1c1917',
    marginBottom: '6px',
  },
  cardUrl: {
    fontSize: '13px',
    color: '#ea580c',
    marginBottom: '4px',
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardMeta: {
    fontSize: '12px',
    color: '#a8a29e',
    marginBottom: '20px',
  },
  editBtn: {
    display: 'inline-block',
    background: '#ea580c',
    color: '#fff',
    border: 'none',
    borderRadius: '7px',
    padding: '8px 18px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    padding: '80px 24px',
    color: '#78716c',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyHeading: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#44403c',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    lineHeight: 1.6,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    marginBottom: '24px',
  },
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchSites() {
      const { data, error } = await supabase
        .from('sites')
        .select('id, name, netlify_url, updated_at')
        .order('created_at', { ascending: true })

      if (error) {
        setError('Failed to load your sites. Please refresh and try again.')
      } else {
        setSites(data ?? [])
      }
      setLoading(false)
    }

    fetchSites()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.logoMark}>N</div>
          <span style={s.logoText}>Client Portal</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.userEmail}>{user?.email}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </header>

      {/* Main */}
      <main style={s.main}>
        <h1 style={s.pageHeading}>Your Sites</h1>
        <p style={s.pageSubheading}>Click Edit to update your website content.</p>

        {error && <div style={s.errorBox}>{error}</div>}

        {loading ? (
          <p style={{ color: '#78716c', fontSize: '14px' }}>Loading your sites…</p>
        ) : sites.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🌐</div>
            <div style={s.emptyHeading}>No sites yet</div>
            <p style={s.emptyText}>
              Your website hasn't been added to the portal yet.<br />
              Contact us to get set up.
            </p>
          </div>
        ) : (
          <div style={s.grid}>
            {sites.map((site) => (
              <div key={site.id} style={s.card}>
                <div style={s.cardName}>{site.name}</div>
                {site.netlify_url ? (
                  <a
                    href={site.netlify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={s.cardUrl}
                  >
                    {site.netlify_url.replace('https://', '')}
                  </a>
                ) : (
                  <span style={{ ...s.cardUrl, color: '#a8a29e' }}>No live URL yet</span>
                )}
                <div style={s.cardMeta}>Last updated: {formatDate(site.updated_at)}</div>
                <button
                  style={s.editBtn}
                  onClick={() => navigate(`/site/${site.id}/edit`)}
                >
                  Edit Content
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
