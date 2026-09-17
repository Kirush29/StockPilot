// StatCard.jsx — Metric KPI Summary Card for Inventory Dashboards
import React from 'react'

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'primary', // primary | success | warning | danger
  className = '',
}) {
  return (
    <div className={`stat-card ${variant}-accent ${className}`.trim()}>
      <div className="stat-card-top">
        <span className="stat-card-label">{label}</span>
        {Icon && (
          <div className={`stat-card-icon ${variant}`} aria-hidden="true">
            <Icon style={{ width: 18, height: 18 }} />
          </div>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      {subtext && <div className="stat-card-subtext">{subtext}</div>}
    </div>
  )
}
