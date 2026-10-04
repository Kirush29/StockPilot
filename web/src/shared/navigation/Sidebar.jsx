// Sidebar.jsx — Polished SaaS Sidebar Navigation
import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useProcurement } from '../../modules/procurement/ProcurementContext'
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
} from '../../components/ui/Icons'

// Roles that can see the Agent Monitoring screen
const AGENT_MONITOR_ROLES = ['BusinessOwner', 'ProcurementManager', 'BranchManager']
import '../layout/layout.css'

// Modules merged from web/src: Sales & Demand (Student 2), Supplier Management (Student 3), Users (Student 1).
const salesLinks = [
  { to: '/sales', label: 'Sales & Forecasts', icon: StockIcon },
]

const supplierLinks = [
  { to: '/suppliers/overview', label: 'Overview',    icon: DashboardIcon },
  { to: '/suppliers',          label: 'Suppliers',   icon: BoxIcon },
  { to: '/quotations',         label: 'Quotations',  icon: ProductsIcon },
  { to: '/evaluation',         label: 'Evaluation',  icon: HistoryIcon },
]

function NavSection({ label, links, onClose }) {
  return (
    <div className="sidebar-section">
      <p className="sidebar-section-label">{label}</p>
      <ul className="sidebar-nav">
        {links.map(({ to, label: text, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end
              className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <Icon />
              <span>{text}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

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
  const { user } = useAuth()
  const { canAccessProcurement, canDecideOrManage } = useProcurement()

  const linksToRender = [
    ...inventoryLinks,
    ...(user?.role === 'BusinessOwner' ? [{ to: '/inventory/branches', label: 'Branches', icon: DashboardIcon }] : [])
  ]

  const procurementLinks = [
    { to: '/procurement/replenishment', label: 'Replenishment Agent', icon: StockIcon },
    { to: '/procurement/proposals', label: 'Proposals',        icon: ProductsIcon },
    { to: '/procurement/orders',    label: 'Purchase Orders',  icon: TransfersIcon },
    canDecideOrManage && { to: '/procurement/approvals', label: 'Approval Queue',  icon: HistoryIcon },
    canDecideOrManage && { to: '/procurement/budgets',   label: 'Budget Dashboard', icon: StockIcon },
  ].filter(Boolean)

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
            <div className="brand-icon-wrapper" style={{ overflow: 'hidden', padding: 0, border: '1px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 0 12px rgba(6, 182, 212, 0.3)' }}>
              <img src="/stockpilot_logo.jpg" alt="StockPilot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="brand-text">
              <span className="brand-name">
                Stock<span>Pilot</span>
              </span>
              <span className="brand-tag">AI Enterprise</span>
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
              {linksToRender.map(({ to, label, icon: Icon }) => (
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

          {canAccessProcurement && (
            <div className="sidebar-section">
              <p className="sidebar-section-label">Procurement</p>
              <ul className="sidebar-nav">
                {procurementLinks.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
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
          )}

          <NavSection label="Sales & Demand" links={salesLinks} onClose={onClose} />
          <NavSection label="Supplier Management" links={supplierLinks} onClose={onClose} />
          {AGENT_MONITOR_ROLES.includes(user?.role) && (
            <NavSection
              label="Agent Monitoring"
              links={[{ to: '/agent-monitoring', label: 'All Agent Runs', icon: HistoryIcon }]}
              onClose={onClose}
            />
          )}
          {user?.role === 'BusinessOwner' && (
            <NavSection label="Administration" links={[{ to: '/users', label: 'Users', icon: CategoriesIcon }]} onClose={onClose} />
          )}
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
