import { NavLink } from 'react-router-dom'
import '../../styles/layout.css'

const inventoryLinks = [
  { to: '/inventory',           label: 'Dashboard' },
  { to: '/inventory/products',  label: 'Products' },
  { to: '/inventory/categories',label: 'Categories' },
  { to: '/inventory/stock',     label: 'Stock Levels' },
  { to: '/inventory/batches',   label: 'Batches' },
  { to: '/inventory/movements', label: 'Stock Movements' },
  { to: '/inventory/transfers', label: 'Transfers' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        Stock<span>Pilot</span>
      </div>

      {/* ── Inventory Management ─────────────────────────────────────────── */}
      <p className="sidebar-section-label">Inventory</p>
      <ul className="sidebar-nav">
        {inventoryLinks.map(({ to, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/inventory'}
              className={({ isActive }) => isActive ? 'active' : undefined}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>

      {/*
        TODO [OTHER-TEAMS]: Add your own sidebar sections below this comment.
        Each team should add their own <p className="sidebar-section-label">
        and <ul className="sidebar-nav"> block here.
        Do not modify the Inventory section above.
      */}
    </aside>
  )
}
