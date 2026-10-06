// Modal.jsx — Reusable Accessible SaaS Modal Wrapper
import React, { useEffect } from 'react'
import { CloseIcon } from './Icons'

export default function Modal({
  title,
  subtitle,
  children,
  onClose,
  maxWidth = '540px',
  className = '',
}) {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`modal ${className}`.trim()}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <CloseIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
