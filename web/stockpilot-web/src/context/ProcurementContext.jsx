import { createContext, useContext, useMemo } from 'react'
import { useAuth } from './AuthContext'

// State management choice: Context API, not Redux Toolkit.
//
// Redux Toolkit isn't installed anywhere in this app, and the one piece of global state this
// module actually needs — "what can the signed-in user do in Procurement" — is derived, read-only
// data computed from AuthContext.user.role. It doesn't need reducers, actions, or a store; it
// needs to be computed once and reused by the sidebar, route guards, and action buttons across
// several pages instead of every page re-deriving the same role checks. That's exactly the shape
// Context already serves for auth in this codebase (see AuthContext.jsx) — reusing the same
// pattern keeps the app consistent with itself. Everything else (proposal lists, order lists,
// budget lists) is per-page server state fetched with useState/useEffect, matching every existing
// Inventory page (ProductsPage, InventoryDashboard, etc.) rather than being duplicated into global
// state that would need manual invalidation.

const RAISE_OR_VIEW_ROLES = ['BranchManager', 'ProcurementManager', 'BusinessOwner']
const MANAGE_ROLES = ['ProcurementManager', 'BusinessOwner']

const ProcurementContext = createContext(null)

export function ProcurementProvider({ children }) {
  const { user } = useAuth()
  const role = user?.role ?? null

  const value = useMemo(() => {
    const canRaiseOrView = RAISE_OR_VIEW_ROLES.includes(role)
    const canManageProcurement = MANAGE_ROLES.includes(role)

    return {
      role,
      canRaiseOrView,
      canManageProcurement,
      // Whether this role can raise/edit/list proposals, budgets, orders at all.
      canAccessProcurement: canRaiseOrView,
      // Whether this role can decide on proposals, convert them, manage orders/budgets.
      // The exact per-proposal amount limit (e.g. ProcurementManager capped at a configured
      // ceiling) is enforced server-side (Procurement:ApprovalLimits) — this only gates whether
      // the action is offered in the UI at all; a 403 from the server is still handled and shown
      // if a proposal exceeds the caller's limit.
      canDecideOrManage: canManageProcurement,
    }
  }, [role])

  return <ProcurementContext.Provider value={value}>{children}</ProcurementContext.Provider>
}

export function useProcurement() {
  const ctx = useContext(ProcurementContext)
  if (!ctx) throw new Error('useProcurement must be used inside ProcurementProvider')
  return ctx
}
