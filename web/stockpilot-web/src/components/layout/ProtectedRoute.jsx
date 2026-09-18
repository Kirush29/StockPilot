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

/**
 * @param {string[]} [roles] - When given, the signed-in user's role must be in this list or they
 * are redirected to `redirectTo`. This is a UI convenience only (hides screens a role has no use
 * for, e.g. a BranchManager landing on the Budget Dashboard) — the API is the real authorization
 * boundary and still returns 401/403 on its own.
 * @param {string} [redirectTo]
 */
export default function ProtectedRoute({ roles, redirectTo = '/' }) {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
