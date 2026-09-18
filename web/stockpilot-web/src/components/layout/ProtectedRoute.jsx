/**
 * AUTH-INTEGRATION-POINT
 * ─────────────────────────────────────────────────────────────────────────────
 * This component is the route guard for authenticated pages.
 *
 * What the auth team must do:
 *   Uncomment the redirect below and wire up isAuthenticated() from AuthContext.
 *   Example:
 *     const { isAuthenticated } = useAuth()
 *     if (!isAuthenticated()) return <Navigate to="/login" replace />
 *
 * Until auth is implemented, all routes render without a token so the
 * Inventory Management UI can be developed and tested independently.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
