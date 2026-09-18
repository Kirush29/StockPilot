import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import InventoryDashboard from './pages/inventory/InventoryDashboard'
import ProductsPage from './pages/inventory/products/ProductsPage'
import CategoriesPage from './pages/inventory/categories/CategoriesPage'
import StockLevelsPage from './pages/inventory/stock/StockLevelsPage'
import BatchesPage from './pages/inventory/batches/BatchesPage'
import StockMovementsPage from './pages/inventory/StockMovementsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/inventory" replace />} />

              <Route path="/inventory"            element={<InventoryDashboard />} />
              <Route path="/inventory/products"   element={<ProductsPage />} />
              <Route path="/inventory/categories" element={<CategoriesPage />} />
              <Route path="/inventory/stock"      element={<StockLevelsPage />} />
              <Route path="/inventory/batches"    element={<BatchesPage />} />
              <Route path="/inventory/movements"  element={<StockMovementsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
