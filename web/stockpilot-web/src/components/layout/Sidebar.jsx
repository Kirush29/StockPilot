// Sidebar.jsx — Polished SaaS Sidebar Navigation
import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  DashboardIcon,
  ProductsIcon,
  CategoriesIcon,
  StockIcon,
  BatchesIcon,
  HistoryIcon,
  TransfersIcon,
  BoxIcon,
  CloseIcon,
} from '../ui/Icons'
import '../../styles/layout.css'

const inventoryLinks = [
  { to: '/inventory',            label: 'Dashboard',        icon: DashboardIcon },
  { to: '/inventory/products',   label: 'Products',         icon: ProductsIcon },
  { to: '/inventory/categories', label: 'Categories',       icon: CategoriesIcon },
  { to: '/inventory/stock',      label: 'Stock Levels',     icon: StockIcon },
  { to: '/inventory/batches',    label: 'Batches',          icon: BatchesIcon },
  { to: '/inventory/movements',  label: 'Stock Movements',  icon: HistoryIcon },
  { to: '/inventory/transfers',  label: 'Transfers',        icon: TransfersIcon },
]

export default function Sidebar({ isOpen = false, onClose }) {
  return (
    <>
      {/* Mobile drawer backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-icon-wrapper">
              <BoxIcon style={{ width: 20, height: 20 }} />
            </div>
            <div className="brand-text">
              <span className="brand-name">
                Stock<span>Pilot</span>
              </span>
              <span className="brand-tag">Inventory v1.0</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <CloseIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="sidebar-content">
          <div className="sidebar-section">
            <p className="sidebar-section-label">Inventory Management</p>
            <ul className="sidebar-nav">
              {inventoryLinks.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/inventory'}
                    className={({ isActive }) =>
                      `sidebar-nav-link ${isActive ? 'active' : ''}`
                    }
                    onClick={onClose}
                  >
                    <Icon />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer State */}
        <div className="sidebar-footer">
          <div className="sidebar-system-badge">
            <span className="system-status-dot" aria-hidden="true" />
            <span>Operational · API Online</span>
          </div>
        </div>
      </aside>
    </>
  )
}
