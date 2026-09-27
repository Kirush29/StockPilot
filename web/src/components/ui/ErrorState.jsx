// ErrorState.jsx — Professional error presentation with 401/403 handling
import React from 'react'
import { AlertCircleIcon, RefreshIcon } from './Icons'

export default function ErrorState({
  error,
  onRetry,
  inline = false,
  className = '',
}) {
  const isAuthError =
    typeof error === 'string' &&
    (error.includes('401') || error.includes('Authentication required') || error.includes('AUTH-INTEGRATION-POINT') || error.includes('Access denied'))

  const message = typeof error === 'string'
    ? error
    : error?.response?.data?.message || error?.message || 'An unexpected error occurred while communicating with the inventory service.'

  if (inline) {
    return (
      <div className={`error-banner ${className}`.trim()} role="alert">
        <div className="error-banner-content">
          <AlertCircleIcon />
          <div>
            <strong>{isAuthError ? 'Authentication Required' : 'Connection Error'}: </strong>
            {message}
          </div>
        </div>
        {onRetry && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
            <RefreshIcon />
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`state-container ${className}`.trim()} role="alert">
      <div className="state-icon-wrapper danger" aria-hidden="true">
        <AlertCircleIcon style={{ width: 28, height: 28 }} />
      </div>
      <h3 className="state-title">
        {isAuthError ? 'Authentication Required' : 'Unable to load inventory data'}
      </h3>
      <p className="state-desc">
        {isAuthError
          ? 'The backend requires an authenticated session to access this resource. When the auth service is connected, valid tokens will be attached automatically.'
          : message}
      </p>
      {onRetry && (
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onRetry}
          style={{ marginTop: 'var(--space-2)' }}
        >
          <RefreshIcon />
          Retry Connection
        </button>
      )}
    </div>
  )
}
