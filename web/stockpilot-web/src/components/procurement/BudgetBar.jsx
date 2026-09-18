// BudgetBar.jsx — allocated vs spent vs remaining indicator, reused as a simple bar chart
import React from 'react'
import { formatCurrency } from '../../utils/procurementEnums'

export default function BudgetBar({ allocated, spent, label, compact = false }) {
  const allocatedNum = Number(allocated) || 0
  const spentNum = Number(spent) || 0
  const remaining = allocatedNum - spentNum
  const pct = allocatedNum > 0 ? Math.min(100, (spentNum / allocatedNum) * 100) : 0

  let fillClass = 'budget-bar-fill-ok'
  if (pct >= 100) fillClass = 'budget-bar-fill-over'
  else if (pct >= 80) fillClass = 'budget-bar-fill-warn'

  return (
    <div className={`budget-bar ${compact ? 'compact' : ''}`}>
      {label && (
        <div className="budget-bar-label">
          <span>{label}</span>
          <span className="budget-bar-pct">{pct.toFixed(1)}% used</span>
        </div>
      )}
      <div className="budget-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`budget-bar-fill ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="budget-bar-figures">
        <span>Spent {formatCurrency(spentNum)}</span>
        <span>Remaining {formatCurrency(remaining)}</span>
        <span>Allocated {formatCurrency(allocatedNum)}</span>
      </div>
    </div>
  )
}
