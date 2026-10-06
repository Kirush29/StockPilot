// Badge.jsx — Unified semantic status badge for StockPilot
import React from 'react'

export default function Badge({
  children,
  variant = 'neutral', // success | warning | danger | info | neutral
  dot = true,
  className = '',
  ...props
}) {
  // Normalize alias variants
  let badgeClass = 'badge-neutral'
  const v = String(variant).toLowerCase()

  if (v === 'success' || v === 'ok' || v === 'active' || v === 'healthy') {
    badgeClass = 'badge-success'
  } else if (v === 'warning' || v === 'low' || v === 'expiring' || v === 'expiring_soon') {
    badgeClass = 'badge-warning'
  } else if (v === 'danger' || v === 'critical' || v === 'expired' || v === 'out_of_stock' || v === 'damaged') {
    badgeClass = 'badge-danger'
  } else if (v === 'info' || v === 'transfer') {
    badgeClass = 'badge-info'
  }

  return (
    <span className={`badge ${badgeClass} ${className}`.trim()} {...props}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}
