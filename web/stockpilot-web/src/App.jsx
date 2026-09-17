import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import InventoryDashboard from './pages/inventory/InventoryDashboard'
import ProductsPage from './pages/inventory/products/ProductsPage'
import CategoriesPage from './pages/inventory/categories/CategoriesPage'
import StockLevelsPage from './pages/inventory/stock/StockLevelsPage'
import BatchesPage from './pages/inventory/batches/BatchesPage'
import StockMovementsPage from './pages/inventory/StockMovementsPage'

// Phase 3–4 pages will be imported here as they are implemented

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Redirect root → inventory dashboard */}
              <Route index element={<Navigate to="/inventory" replace />} />

              {/* ── Inventory Management ─────────────────────────────────── */}
              <Route path="/inventory"            element={<InventoryDashboard />} />
              <Route path="/inventory/products"   element={<ProductsPage />} />
              <Route path="/inventory/categories" element={<CategoriesPage />} />
              <Route path="/inventory/stock"      element={<StockLevelsPage />} />
              <Route path="/inventory/batches"    element={<BatchesPage />} />
              <Route path="/inventory/movements"  element={<StockMovementsPage />} />

              {/* Phase 3 — Stock Levels, Batches, Movements  */}
              {/* Phase 4 — Transfers                         */}
            </Route>
          </Route>

          {/* TODO [AUTH-TEAM]: Add /login route here when auth is implemented */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
