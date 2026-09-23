import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProcurementProvider } from './context/ProcurementContext'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import RoleBasedDashboard from './pages/inventory/RoleBasedDashboard'
import ProductsPage from './pages/inventory/products/ProductsPage'
import CategoriesPage from './pages/inventory/categories/CategoriesPage'
import StockLevelsPage from './pages/inventory/stock/StockLevelsPage'
import BatchesPage from './pages/inventory/batches/BatchesPage'
import StockMovementsPage from './pages/inventory/StockMovementsPage'
import TransfersPage from './pages/inventory/TransfersPage'
import ProposalsListPage from './pages/procurement/ProposalsListPage'
import ProposalDetailPage from './pages/procurement/ProposalDetailPage'
import NewProposalPage from './pages/procurement/NewProposalPage'
import EditProposalPage from './pages/procurement/EditProposalPage'
import ApprovalQueuePage from './pages/procurement/ApprovalQueuePage'
import PurchaseOrdersPage from './pages/procurement/PurchaseOrdersPage'
import BudgetDashboardPage from './pages/procurement/BudgetDashboardPage'
import ProfilePage from './pages/auth/ProfilePage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'

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
              </Route>

              {/* Procurement — BranchManager / ProcurementManager / BusinessOwner */}
              <Route element={<ProtectedRoute roles={RAISE_OR_VIEW_ROLES} redirectTo="/inventory" />}>
                <Route element={<AppLayout />}>
                  <Route path="/procurement/proposals"          element={<ProposalsListPage />} />
                  <Route path="/procurement/proposals/new"      element={<NewProposalPage />} />
                  <Route path="/procurement/proposals/:id"      element={<ProposalDetailPage />} />
                  <Route path="/procurement/proposals/:id/edit" element={<EditProposalPage />} />
                  <Route path="/procurement/orders"             element={<PurchaseOrdersPage />} />
                </Route>
              </Route>

              {/* Procurement approval + budget — ProcurementManager / BusinessOwner only */}
              <Route element={<ProtectedRoute roles={MANAGE_PROCUREMENT_ROLES} redirectTo="/procurement/proposals" />}>
                <Route element={<AppLayout />}>
                  <Route path="/procurement/approvals" element={<ApprovalQueuePage />} />
                  <Route path="/procurement/budgets"   element={<BudgetDashboardPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ProcurementProvider>
    </AuthProvider>
  )
}
