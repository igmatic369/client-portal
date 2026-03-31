import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Client routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/site/:siteId/edit"
        element={
          <ProtectedRoute>
            <Editor />
          </ProtectedRoute>
        }
      />

      {/* Admin routes — Phase 4 */}
      <Route
        path="/admin/*"
        element={
          <AdminRoute>
            <div style={{ padding: '40px', fontFamily: 'sans-serif', color: '#78716c' }}>
              Admin panel — coming in Phase 4
            </div>
          </AdminRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
