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
    background: '#ea580c', color: '#fff', border: 'none',
    borderRadius: '7px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: {
    textAlign: 'left', padding: '10px 12px', fontWeight: 600, color: '#78716c',
    borderBottom: '1.5px solid #e7e5e4', fontSize: '12px',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  td: { padding: '12px 12px', borderBottom: '1px solid #f5f5f4', color: '#1c1917', verticalAlign: 'middle' },
  tdMuted: { padding: '12px 12px', borderBottom: '1px solid #f5f5f4', color: '#a8a29e', verticalAlign: 'middle' },
  badge: {
    display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
    fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  errorBox: {
    background: '#fef2f2', border: '1px solid #fecaca',
    color: '#dc2626', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px',
  },
}

export default function ClientsList() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [siteCountMap, setSiteCountMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: usersData, error: usersErr }, { data: sitesData }] = await Promise.all([
        supabase.functions.invoke('admin-list-users'),
        supabase.from('sites').select('owner_id'),
      ])

      if (usersErr) { setError('Failed to load users: ' + usersErr.message); setLoading(false); return }

      setUsers(usersData?.users ?? [])

      // Build owner_id → site count map
      const counts = {}
      ;(sitesData ?? []).forEach(({ owner_id }) => {
        if (owner_id) counts[owner_id] = (counts[owner_id] ?? 0) + 1
      })
      setSiteCountMap(counts)
      setLoading(false)
    }
    load()
  }, [])

  const roleBadge = (role) => {
    const isAdmin = role === 'admin'
    return (
      <span style={{
        ...s.badge,
        background: isAdmin ? '#fff7ed' : '#f5f5f4',
        color: isAdmin ? '#ea580c' : '#78716c',
        border: `1px solid ${isAdmin ? '#fed7aa' : '#e7e5e4'}`,
      }}>
        {role ?? 'client'}
      </span>
    )
  }

  return (
    <div>
      <div style={s.topBar}>
        <h1 style={s.heading}>All Clients</h1>
        <button style={s.newBtn} onClick={() => navigate('/admin/clients/new')}>
          + Create New Client
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {loading ? (
        <p style={{ color: '#78716c', fontSize: '14px' }}>Loading users…</p>
      ) : users.length === 0 ? (
        <p style={{ color: '#a8a29e', fontSize: '14px' }}>No users found.</p>
      ) : (
        <div style={{ background: '#fff', border: '1.5px solid #e7e5e4', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Email</th>
                <th style={s.th}>Role</th>
                <th style={s.th}>Sites</th>
                <th style={s.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td style={{ ...s.td, fontWeight: 500 }}>{user.email}</td>
                  <td style={s.td}>{roleBadge(user.role)}</td>
                  <td style={siteCountMap[user.id] ? s.td : s.tdMuted}>
                    {siteCountMap[user.id] ?? 0}
                  </td>
                  <td style={s.tdMuted}>{formatDate(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
