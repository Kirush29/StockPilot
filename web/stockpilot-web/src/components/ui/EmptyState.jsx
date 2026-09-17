// EmptyState.jsx — Polished SaaS Empty State Component
import React from 'react'
import { BoxIcon } from './Icons'

export default function EmptyState({
  icon: Icon = BoxIcon,
  title = 'No records found',
  description = 'There is currently no data to display.',
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  className = '',
}) {
  return (
    <div className={`state-container ${className}`.trim()}>
      <div className="state-icon-wrapper" aria-hidden="true">
        <Icon style={{ width: 28, height: 28 }} />
      </div>
      <h3 className="state-title">{title}</h3>
      <p className="state-desc">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={onAction}
          style={{ marginTop: 'var(--space-2)' }}
        >
          {ActionIcon && <ActionIcon />}
          {actionLabel}
        </button>
      )}
    </div>
  )
}
