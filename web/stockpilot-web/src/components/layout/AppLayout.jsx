// AppLayout.jsx — Polished SaaS Layout with Responsive Header & Sidebar
import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../context/AuthContext'
import { MenuIcon } from '../ui/Icons'
import '../../styles/layout.css'

const routeTitles = {
  '/inventory':            'Inventory Dashboard',
  '/inventory/products':   'Products Management',
  '/inventory/categories': 'Product Categories',
  '/inventory/stock':      'Stock Levels',
  '/inventory/batches':    'Batches & Expiry',
  '/inventory/movements':  'Stock Movements',
  '/inventory/transfers':  'Stock Transfers',
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const { isAuthenticated } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const currentTitle = Object.entries(routeTitles)
    .find(([path]) => pathname.startsWith(path) && (pathname === path || pathname[path.length] === '/'))
    ?.[1] ?? 'StockPilot'

  return (
    <div className="app-layout">
      {/* Responsive Sidebar */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-area">
        {/* Top Header */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <MenuIcon style={{ width: 20, height: 20 }} />
            </button>

            <div className="topbar-breadcrumbs">
              <span>Inventory</span>
              <span>/</span>
              <span className="current">{currentTitle}</span>
            </div>
          </div>

          <div className="topbar-right">
            {/* AUTH-INTEGRATION-POINT notice: clean status indicator */}
            {!isAuthenticated() ? (
              <div
                className="topbar-auth-pill warning"
                title="API endpoints require authentication. Valid token will be attached once Auth provider is integrated."
              >
                <span className="topbar-auth-dot" />
                <span>Integration Mode · Auth Pending</span>
              </div>
            ) : (
              <div className="topbar-auth-pill">
                <span className="topbar-auth-dot" style={{ background: '#10b981' }} />
                <span>Authenticated</span>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
