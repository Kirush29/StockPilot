// Skeleton.jsx — Shimmer loading skeleton placeholders
import React from 'react'

export function Skeleton({ className = '', style = {}, height, width, circle = false, ...props }) {
  return (
    <div
      className={`skeleton ${circle ? 'skeleton-circle' : ''} ${className}`.trim()}
      style={{
        height: height || undefined,
        width: width || undefined,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton height="14px" width="40%" />
        <Skeleton height="36px" width="36px" circle />
      </div>
      <Skeleton height="32px" width="60%" style={{ marginTop: '8px' }} />
      <Skeleton height="12px" width="75%" style={{ marginTop: '4px' }} />
    </div>
  )
}

export function TableRowSkeleton({ columns = 6 }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <Skeleton height="16px" width={i === 0 ? '70%' : i === 1 ? '40%' : '50%'} />
        </td>
      ))}
    </tr>
  )
}

export function TableSkeleton({ rows = 5, columns = 6, title = 'Loading data…' }) {
  return (
    <div className="table-card">
      <div className="table-card-header">
        <span className="table-card-title">{title}</span>
        <Skeleton height="20px" width="60px" style={{ borderRadius: '999px' }} />
      </div>
      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i}>
                  <Skeleton height="12px" width="50px" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
