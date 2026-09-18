// EmployeeDashboard.jsx — Operational view for Store Employees
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { transfersApi, batchesApi } from '../../api/inventoryApi'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { CardSkeleton } from '../../components/ui/Skeleton'
import { RefreshIcon, TransfersIcon, ClockIcon } from '../../components/ui/Icons'
import '../../styles/inventory.css'

const STATUS_VARIANT = {
  Pending:  'warning',
  Approved: 'info',
  Shipped:  'primary',
  Received: 'success',
  Rejected: 'danger',
  Cancelled:'default',
}

export default function EmployeeDashboard() {
  const [transfers, setTransfers] = useState([])
  const [expiring, setExpiring]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [trRes, expRes] = await Promise.all([
        transfersApi.getAll().catch(() => ({ data: { data: [] } })),
        batchesApi.getExpiring(14).catch(() => ({ data: { data: [] } })),
      ])
      setTransfers(trRes.data?.data ?? [])
      setExpiring(expRes.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Employees can ship (Approved) and receive (Shipped)
  const toShip    = transfers.filter(t => t.status === 'Approved')
  const toReceive = transfers.filter(t => t.status === 'Shipped')
  const urgentExpiry = expiring.length

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Operations Dashboard</h1>
          <p>Your pending shipping, receiving tasks, and urgent stock alerts</p>
        </div>
        <div className="page-header-actions">
          <Link to="/inventory/transfers" className="btn btn-primary">
            <TransfersIcon style={{ width: 16, height: 16 }} />
            View Transfers
          </Link>
          <button type="button" className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="stat-grid">
          {[1,2,3].map(k => <CardSkeleton key={k} />)}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={fetchData} />
      ) : (
        <div className="stat-grid">
          <StatCard label="Ready to Ship" value={toShip.length.toLocaleString()} subtext={toShip.length > 0 ? 'Approved transfers awaiting shipment' : 'No shipments pending'} icon={TransfersIcon} variant={toShip.length > 0 ? 'warning' : 'success'} />
          <StatCard label="Ready to Receive" value={toReceive.length.toLocaleString()} subtext={toReceive.length > 0 ? 'Transfers in transit to confirm' : 'No pending receipts'} icon={TransfersIcon} variant={toReceive.length > 0 ? 'primary' : 'success'} />
          <StatCard label="Urgent Expiry" value={urgentExpiry.toLocaleString()} subtext={urgentExpiry > 0 ? 'Batches expiring within 14 days' : 'No urgent expiry alerts'} icon={ClockIcon} variant={urgentExpiry > 0 ? 'danger' : 'success'} />
        </div>
      )}

      {!loading && !error && toShip.length > 0 && (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Ready to Ship</span>
              <span className="count-badge">{toShip.length}</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              These approved transfers need to be shipped from your branch
            </p>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transfer #</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Items</th>
                  <th>Approved By</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {toShip.map(t => (
                  <tr key={t.stockTransferId} className="row-warning">
                    <td><span className="sku-pill">{t.transferNumber}</span></td>
                    <td>{t.sourceBranchName}</td>
                    <td>{t.destinationBranchName}</td>
                    <td style={{ textAlign: 'right' }}>{t.items?.length ?? 0}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>{t.approvedByName ?? '—'}</td>
                    <td>
                      <Link to="/inventory/transfers" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
                        Ship Now →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && toReceive.length > 0 && (
        <div className="table-card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="table-card-header">
            <div className="table-card-title">
              <span>In Transit — Confirm Receipt</span>
              <span className="count-badge">{toReceive.length}</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              These transfers are en route to your branch and need receipt confirmation
            </p>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Transfer #</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {toReceive.map(t => (
                  <tr key={t.stockTransferId}>
                    <td><span className="sku-pill">{t.transferNumber}</span></td>
                    <td>{t.sourceBranchName}</td>
                    <td>{t.destinationBranchName}</td>
                    <td style={{ textAlign: 'right' }}>{t.items?.length ?? 0}</td>
                    <td><Badge variant="primary">Shipped</Badge></td>
                    <td>
                      <Link to="/inventory/transfers" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
                        Confirm Receipt →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && toShip.length === 0 && toReceive.length === 0 && urgentExpiry === 0 && (
        <div className="table-card">
          <EmptyState title="No Tasks Pending" description="All transfers are up to date and there are no urgent stock alerts. Check back later." />
        </div>
      )}
    </div>
  )
}
