import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import AdminLayout from './pages/admin/AdminLayout'
import SitesList from './pages/admin/SitesList'
import CreateSite from './pages/admin/CreateSite'
import EditSite from './pages/admin/EditSite'
import ClientsList from './pages/admin/ClientsList'
import CreateClient from './pages/admin/CreateClient'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

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

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/sites" replace />} />
        <Route path="sites" element={<SitesList />} />
        <Route path="sites/new" element={<CreateSite />} />
        <Route path="sites/:siteId" element={<EditSite />} />
        <Route path="clients" element={<ClientsList />} />
        <Route path="clients/new" element={<CreateClient />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
