// BranchManagerDashboard.jsx — Branch-specific view for Branch Managers
import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { inventoryApi, transfersApi, batchesApi } from '../../api/inventoryApi'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { CardSkeleton, TableSkeleton } from '../../components/ui/Skeleton'
import { RefreshIcon, AlertCircleIcon, TransfersIcon, ClockIcon, StockIcon } from '../../components/ui/Icons'
import AiInsightsWidget from '../../components/ui/AiInsightsWidget'
import '../../styles/inventory.css'

const STATUS_VARIANT = {
  Pending:  'warning',
  Approved: 'info',
  Shipped:  'primary',
  Received: 'success',
  Rejected: 'danger',
  Cancelled:'default',
}

export default function BranchManagerDashboard() {
  const [inventory, setInventory]   = useState([])
  const [transfers, setTransfers]   = useState([])
  const [expiring, setExpiring]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [invRes, trRes, expRes] = await Promise.all([
        inventoryApi.getLowStock().catch(err => { console.error(err); return { data: { data: [] } }; }),
        transfersApi.getAll().catch(err => { console.error(err); return { data: { data: [] } }; }),
        batchesApi.getExpiring(30).catch(err => { console.error(err); return { data: { data: [] } }; }),
      ])
      setInventory(invRes.data?.data ?? [])
      setTransfers(trRes.data?.data ?? [])
      setExpiring(expRes.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const activeTransfers   = transfers.filter(t => ['Pending','Approved','Shipped'].includes(t.status))
  const lowStockCount     = inventory.length
  const expiringCount     = expiring.length
  const pendingApprovals  = transfers.filter(t => t.status === 'Pending').length

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Branch Manager Dashboard</h1>
          <p>Monitor your branch stock health, pending transfers, and expiry alerts</p>
        </div>
        <div className="page-header-actions">
          <Link to="/inventory/transfers" className="btn btn-primary">
            <TransfersIcon style={{ width: 16, height: 16 }} />
            Manage Transfers
          </Link>
          <button type="button" className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="stat-grid">
          {[1,2,3,4].map(k => <CardSkeleton key={k} />)}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={fetchData} />
      ) : (
        <div className="stat-grid">
          <StatCard label="Low Stock Items" value={lowStockCount.toLocaleString()} subtext={lowStockCount > 0 ? 'Request transfers to restock' : 'All levels healthy'} icon={StockIcon} variant={lowStockCount > 0 ? 'warning' : 'success'} />
          <StatCard label="Pending Approvals" value={pendingApprovals.toLocaleString()} subtext={pendingApprovals > 0 ? 'Transfers awaiting your approval' : 'No pending approvals'} icon={TransfersIcon} variant={pendingApprovals > 0 ? 'warning' : 'success'} />
          <StatCard label="Active Transfers" value={activeTransfers.length.toLocaleString()} subtext="In-progress transfer requests" icon={TransfersIcon} variant="primary" />
          <StatCard label="Expiring Batches" value={expiringCount.toLocaleString()} subtext={expiringCount > 0 ? 'Within next 30 days' : 'No near-expiry batches'} icon={ClockIcon} variant={expiringCount > 0 ? 'warning' : 'success'} />
        </div>
      )}

      {!loading && !error && (
        <AiInsightsWidget />
      )}

      {!loading && !error && activeTransfers.length > 0 && (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Active Transfers</span>
              <span className="count-badge">{activeTransfers.length}</span>
            </div>
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
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {activeTransfers.slice(0, 10).map(t => (
                  <tr key={t.stockTransferId}>
                    <td><span className="sku-pill">{t.transferNumber}</span></td>
                    <td>{t.sourceBranchName}</td>
                    <td>{t.destinationBranchName}</td>
                    <td style={{ textAlign: 'right' }}>{t.items?.length ?? 0}</td>
                    <td><Badge variant={STATUS_VARIANT[t.status] ?? 'default'}>{t.status}</Badge></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      {new Date(t.requestedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeTransfers.length > 10 && (
            <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
              <Link to="/inventory/transfers" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', fontWeight: 600 }}>
                View all {activeTransfers.length} transfers →
              </Link>
            </div>
          )}
        </div>
      )}

      {!loading && !error && lowStockCount > 0 && (
        <div className="table-card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Low Stock — Transfer Required</span>
              <span className="count-badge">{lowStockCount}</span>
            </div>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>On Hand</th>
                  <th style={{ textAlign: 'right' }}>Reorder Level</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.inventoryId} className={(Number(item.quantityOnHand) || 0) === 0 ? 'row-danger' : 'row-warning'}>
                    <td><strong>{item.productName}</strong></td>
                    <td><span className="sku-pill">{item.sku}</span></td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <strong style={{ color: (Number(item.quantityOnHand) || 0) === 0 ? 'var(--color-danger)' : 'var(--color-warning)' }}>
                        {(Number(item.quantityOnHand) || 0).toLocaleString()}
                      </strong>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {(Number(item.reorderLevel) || 0).toLocaleString()}
                    </td>
                    <td>
                      <Link to="/inventory/transfers" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
                        Request Transfer →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && activeTransfers.length === 0 && lowStockCount === 0 && (
        <div className="table-card">
          <EmptyState title="Everything Looks Good" description="No low stock items or active transfers to manage right now." />
        </div>
      )}
    </div>
  )
}
