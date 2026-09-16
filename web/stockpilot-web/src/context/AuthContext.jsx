import { createContext, useContext } from 'react'

/**
 * AUTH-INTEGRATION-POINT
 * ─────────────────────────────────────────────────────────────────────────────
 * This context is a clean stub for the authentication team to implement.
 *
 * What the auth team must provide:
 *   - getToken()  → returns the current JWT string, or null if not authenticated
 *   - getUser()   → returns the decoded user object { userId, role, ... }, or null
 *   - isAuthenticated() → boolean
 *
 * How to integrate:
 *   1. Replace the AuthProvider below with your real session/token provider.
 *   2. Populate getToken() to return the stored JWT (localStorage, cookie, etc.).
 *   3. The axiosClient.js interceptor already calls getToken() — no other changes needed.
 *
 * Do NOT hardcode tokens here.
 * Do NOT implement login/logout here — that belongs in the auth component.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // TODO [AUTH-TEAM]: Replace this stub with your real auth state.
  // Example: read token from localStorage, a cookie, or your auth library's session.
  const value = {
    getToken: () => null,           // TODO [AUTH-TEAM]: return real JWT string
    getUser: () => null,            // TODO [AUTH-TEAM]: return decoded user object
    isAuthenticated: () => false,   // TODO [AUTH-TEAM]: return true when token is valid
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
