// AppLayout.jsx — Polished SaaS Layout with Responsive Header & Sidebar
import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
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

const ROLE_LABELS = {
  BusinessOwner:      'Business Owner',
  ProcurementManager: 'Procurement Manager',
  BranchManager:      'Branch Manager',
  StoreEmployee:      'Store Employee',
}

export default function AppLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const currentTitle = Object.entries(routeTitles)
    .find(([path]) => pathname.startsWith(path) && (pathname === path || pathname[path.length] === '/'))
    ?.[1] ?? 'StockPilot'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="main-area">
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
            <div className="topbar-status-pill">
              <span className="topbar-status-dot" />
              <span>API Online</span>
            </div>

            {user && (
              <div className="topbar-user-menu-wrapper">
                <button
                  type="button"
                  className="topbar-user-btn"
                  onClick={() => setShowUserMenu(p => !p)}
                  aria-label="Open user menu"
                >
                  <div className="topbar-avatar">{initials}</div>
                  <div className="topbar-user-info">
                    <span className="topbar-user-name">{user.fullName}</span>
                    <span className="topbar-user-role">{ROLE_LABELS[user.role] ?? user.role}</span>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {showUserMenu && (
                  <>
                    <div className="topbar-user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
                    <div className="topbar-user-menu">
                      <div className="topbar-user-menu-header">
                        <div className="topbar-avatar topbar-avatar-lg">{initials}</div>
                        <div>
                          <p className="menu-user-name">{user.fullName}</p>
                          <p className="menu-user-email">{user.email}</p>
                          <span className="menu-role-badge">{ROLE_LABELS[user.role] ?? user.role}</span>
                        </div>
                      </div>
                      <div className="topbar-user-menu-divider" />
                      <button
                        type="button"
                        className="topbar-user-menu-item logout"
                        onClick={handleLogout}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
