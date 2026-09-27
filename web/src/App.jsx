import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './shared/auth/AuthContext'
import { ProcurementProvider } from './modules/procurement/ProcurementContext'
import AppLayout from './shared/layout/AppLayout'
import ProtectedRoute from './shared/auth/ProtectedRoute'
import LoginPage from './shared/auth/pages/LoginPage'
import RoleBasedDashboard from './modules/inventory/RoleBasedDashboard'
import ProductsPage from './modules/inventory/products/ProductsPage'
import CategoriesPage from './modules/inventory/categories/CategoriesPage'
import StockLevelsPage from './modules/inventory/stock/StockLevelsPage'
import BatchesPage from './modules/inventory/batches/BatchesPage'
import StockMovementsPage from './modules/inventory/StockMovementsPage'
import TransfersPage from './modules/inventory/TransfersPage'
import BranchesPage from './modules/inventory/branches/BranchesPage'
import ProposalsListPage from './modules/procurement/ProposalsListPage'
import ProposalDetailPage from './modules/procurement/ProposalDetailPage'
import NewProposalPage from './modules/procurement/NewProposalPage'
import EditProposalPage from './modules/procurement/EditProposalPage'
import ApprovalQueuePage from './modules/procurement/ApprovalQueuePage'
import PurchaseOrdersPage from './modules/procurement/PurchaseOrdersPage'
import BudgetDashboardPage from './modules/procurement/BudgetDashboardPage'
import ReplenishmentPage from './modules/procurement/ReplenishmentPage'
import { TableSkeleton } from './components/ui/Skeleton'

// Modules merged from web/src (TSX + Tailwind, themed by styles/tailwind.css). Loaded on demand: the Sales
// dashboard's charting library is large and not needed by the rest of the app.
const SalesDashboardPage = lazy(() => import('./modules/sales-demand/SalesDashboardPage'))
const SupplierOverviewPage = lazy(() => import('./modules/suppliers/pages/Home'))
const SuppliersPage = lazy(() => import('./modules/suppliers/pages/Suppliers'))
const QuotationsPage = lazy(() => import('./modules/suppliers/pages/Quotations'))
const EvaluationPage = lazy(() => import('./modules/suppliers/pages/Evaluation'))
const UsersPage = lazy(() => import('./modules/inventory/users/pages/Users'))
const AgentMonitoringPage = lazy(() => import('./modules/agent-monitoring/AgentMonitoringPage'))

/** Suspends only the page area, so the shell layout stays on screen while a module loads. */
const page = (Component) => (
  <Suspense fallback={<TableSkeleton rows={4} columns={4} title="Loading…" />}>
    <Component />
  </Suspense>
)
import ProfilePage from './shared/auth/pages/ProfilePage'
import ChangePasswordPage from './shared/auth/pages/ChangePasswordPage'

// Role gate constants
const RAISE_OR_VIEW_ROLES = ['BranchManager', 'ProcurementManager', 'BusinessOwner']
const MANAGE_PROCUREMENT_ROLES = ['ProcurementManager', 'BusinessOwner']

export default function App() {
  return (
    <AuthProvider>
      <ProcurementProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Routes — all authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/inventory" replace />} />

                {/* Auth Profile */}
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />

                {/* Inventory Management */}
                <Route path="/inventory"            element={<RoleBasedDashboard />} />
                <Route path="/inventory/products"   element={<ProductsPage />} />
                <Route path="/inventory/categories" element={<CategoriesPage />} />
                <Route path="/inventory/stock"      element={<StockLevelsPage />} />
                <Route path="/inventory/batches"    element={<BatchesPage />} />
                <Route path="/inventory/movements"  element={<StockMovementsPage />} />
                <Route path="/inventory/transfers"  element={<TransfersPage />} />

                {/* Sales & Demand — reads and POS sales for every signed-in role; forecast runs are role-checked by the API (D13) */}
                <Route path="/sales" element={page(SalesDashboardPage)} />

                {/* Supplier Management — reads for every signed-in role; writes need ProcurementManage (D3) */}
                <Route path="/suppliers/overview" element={page(SupplierOverviewPage)} />
                <Route path="/suppliers"          element={page(SuppliersPage)} />
                <Route path="/quotations"         element={page(QuotationsPage)} />
                <Route path="/evaluation"         element={page(EvaluationPage)} />
              </Route>

              {/* Procurement — BranchManager / ProcurementManager / BusinessOwner */}
              <Route element={<ProtectedRoute roles={RAISE_OR_VIEW_ROLES} redirectTo="/inventory" />}>
                <Route element={<AppLayout />}>
                  <Route path="/procurement/proposals"          element={<ProposalsListPage />} />
                  <Route path="/procurement/proposals/new"      element={<NewProposalPage />} />
                  <Route path="/procurement/proposals/:id"      element={<ProposalDetailPage />} />
                  <Route path="/procurement/proposals/:id/edit" element={<EditProposalPage />} />
                  <Route path="/procurement/orders"             element={<PurchaseOrdersPage />} />
                  <Route path="/procurement/replenishment"      element={<ReplenishmentPage />} />
                  <Route path="/procurement/replenishment/:workflowId" element={<ReplenishmentPage />} />
                </Route>
              </Route>

              {/* Procurement approval + budget — ProcurementManager / BusinessOwner only */}
              <Route element={<ProtectedRoute roles={MANAGE_PROCUREMENT_ROLES} redirectTo="/procurement/proposals" />}>
                <Route element={<AppLayout />}>
                  <Route path="/procurement/approvals" element={<ApprovalQueuePage />} />
                  <Route path="/procurement/budgets"   element={<BudgetDashboardPage />} />
                </Route>
              </Route>

              {/* System Admin / BusinessOwner only */}
              <Route element={<ProtectedRoute roles={['BusinessOwner']} redirectTo="/inventory" />}>
                <Route element={<AppLayout />}>
                  <Route path="/inventory/branches" element={<BranchesPage />} />
                  <Route path="/users"              element={page(UsersPage)} />
                </Route>
              </Route>

              {/* Agent Monitoring — managers and business owner */}
              <Route element={<ProtectedRoute roles={['BusinessOwner', 'ProcurementManager', 'BranchManager']} redirectTo="/inventory" />}>
                <Route element={<AppLayout />}>
                  <Route path="/agent-monitoring" element={page(AgentMonitoringPage)} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ProcurementProvider>
    </AuthProvider>
  )
}
