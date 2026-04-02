import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

const s = {
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  heading: { fontSize: '22px', fontWeight: 700, color: '#1c1917', margin: 0 },
  newBtn: {
    background: '#ea580c',
    color: '#fff',
    border: 'none',
    borderRadius: '7px',
    padding: '9px 18px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  search: {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #e7e5e4',
    borderRadius: '7px',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '16px',
    boxSizing: 'border-box',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    fontWeight: 600,
    color: '#78716c',
    borderBottom: '1.5px solid #e7e5e4',
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  td: {
    padding: '12px 12px',
    borderBottom: '1px solid #f5f5f4',
    color: '#1c1917',
    verticalAlign: 'middle',
  },
  tdMuted: {
    padding: '12px 12px',
    borderBottom: '1px solid #f5f5f4',
    color: '#a8a29e',
    verticalAlign: 'middle',
  },
  row: { cursor: 'pointer', transition: 'background 0.1s' },
  link: { color: '#ea580c', textDecoration: 'none', fontSize: '12px' },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px',
  },
}

export default function SitesList() {
  const navigate = useNavigate()
  const [sites, setSites] = useState([])
  const [userMap, setUserMap] = useState({}) // id → email
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // Fetch all sites (admin RLS policy allows this)
      const { data: sitesData, error: sitesErr } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false })

      if (sitesErr) {
        setError('Failed to load sites: ' + sitesErr.message)
        setLoading(false)
        return
      }
      setSites(sitesData ?? [])

      // Fetch user list for owner emails
      const { data: usersData, error: usersErr } = await supabase.functions.invoke('admin-list-users')
      if (!usersErr && usersData?.users) {
        const map = {}
        usersData.users.forEach((u) => { map[u.id] = u.email })
        setUserMap(map)
      }

      setLoading(false)
    }
    load()
  }, [])

  const filtered = sites.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div style={s.topBar}>
        <h1 style={s.heading}>All Sites</h1>
        <button style={s.newBtn} onClick={() => navigate('/admin/sites/new')}>
          + Create New Site
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      <input
        type="text"
        placeholder="Search by site name…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={s.search}
      />

      {loading ? (
        <p style={{ color: '#78716c', fontSize: '14px' }}>Loading sites…</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#a8a29e', fontSize: '14px' }}>
          {search ? 'No sites match your search.' : 'No sites yet.'}
        </p>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #e7e5e4', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Site Name</th>
                <th style={s.th}>Owner</th>
                <th style={s.th}>Live URL</th>
                <th style={s.th}>GitHub Repo</th>
                <th style={s.th}>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((site) => (
                <tr
                  key={site.id}
                  style={s.row}
                  onClick={() => navigate(`/admin/sites/${site.id}`)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fafaf9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = ''}
                >
                  <td style={{ ...s.td, fontWeight: 600 }}>{site.name}</td>
                  <td style={site.owner_id ? s.td : s.tdMuted}>
                    {userMap[site.owner_id] ?? (site.owner_id ? site.owner_id.slice(0, 8) + '…' : '—')}
                  </td>
                  <td style={s.td}>
                    {site.netlify_url ? (
                      <a
                        href={site.netlify_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={s.link}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {site.netlify_url.replace('https://', '')}
                      </a>
                    ) : <span style={{ color: '#a8a29e' }}>—</span>}
                  </td>
                  <td style={s.tdMuted}>{site.github_repo ?? '—'}</td>
                  <td style={s.tdMuted}>{formatDate(site.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
