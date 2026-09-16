import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import '../../styles/layout.css'

const routeTitles = {
  '/inventory':            'Inventory Dashboard',
  '/inventory/products':   'Products',
  '/inventory/categories': 'Categories',
  '/inventory/stock':      'Stock Levels',
  '/inventory/batches':    'Batches',
  '/inventory/movements':  'Stock Movements',
  '/inventory/transfers':  'Transfers',
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuth()

  const title = Object.entries(routeTitles)
    .find(([path]) => pathname.startsWith(path) && (pathname === path || pathname[path.length] === '/'))
    ?.[1] ?? 'StockPilot'

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          {/* AUTH-INTEGRATION-POINT: replace this notice once auth team wires up tokens */}
          {!isAuthenticated() && (
            <span className="topbar-auth-notice">
              ⚠ Not authenticated — API calls will return 401 until auth is connected
            </span>
          )}
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
