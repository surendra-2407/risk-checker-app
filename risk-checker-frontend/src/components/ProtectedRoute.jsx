import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute() {
  // Simple mock check
  const token = localStorage.getItem('auth_token')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
