import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const s = {
  page: { minHeight: '100vh', background: '#f5f5f4', display: 'flex', flexDirection: 'column' },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e7e5e4',
    padding: '0 24px',
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  backBtn: {
    background: 'none',
    border: '1.5px solid #e7e5e4',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    color: '#44403c',
    cursor: 'pointer',
    fontWeight: 500,
  },
  adminBadge: {
    background: '#ea580c',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '4px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  title: { fontSize: '15px', fontWeight: 600, color: '#1c1917' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  userEmail: { fontSize: '13px', color: '#78716c' },
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
  body: { display: 'flex', flex: 1, minHeight: 0 },
  sidebar: {
    width: '200px',
    background: '#fff',
    borderRight: '1px solid #e7e5e4',
    padding: '20px 0',
    flexShrink: 0,
  },
  sidebarSection: {
    fontSize: '11px',
    fontWeight: 600,
    color: '#a8a29e',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '0 16px',
    marginBottom: '8px',
  },
  main: { flex: 1, padding: '32px 32px', overflowY: 'auto' },
}

const navLinkStyle = ({ isActive }) => ({
  display: 'block',
  padding: '9px 16px',
  fontSize: '14px',
  fontWeight: isActive ? 600 : 400,
  color: isActive ? '#ea580c' : '#44403c',
  textDecoration: 'none',
  borderLeft: isActive ? '3px solid #ea580c' : '3px solid transparent',
  background: isActive ? '#fff7ed' : 'transparent',
  transition: 'background 0.1s, color 0.1s',
})

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <button style={s.backBtn} onClick={() => navigate('/')}>← Dashboard</button>
          <span style={s.adminBadge}>Admin</span>
          <span style={s.title}>Admin Panel</span>
        </div>
        <div style={s.headerRight}>
          <span style={s.userEmail}>{user?.email}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div style={s.body}>
        <nav style={s.sidebar}>
          <div style={s.sidebarSection}>Manage</div>
          <NavLink to="/admin/sites" style={navLinkStyle}>Sites</NavLink>
          <NavLink to="/admin/clients" style={navLinkStyle}>Clients</NavLink>
        </nav>
        <main style={s.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
