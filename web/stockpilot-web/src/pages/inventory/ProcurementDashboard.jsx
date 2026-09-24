// ProcurementDashboard.jsx — Focused view for Procurement Manager
import React, { useState, useEffect, useCallback } from 'react'
import { inventoryApi, batchesApi } from '../../api/inventoryApi'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { CardSkeleton, TableSkeleton } from '../../components/ui/Skeleton'
import { RefreshIcon, AlertCircleIcon, ClockIcon, StockIcon, ProductsIcon } from '../../components/ui/Icons'
import '../../styles/inventory.css'

export default function ProcurementDashboard() {
  const [lowStock, setLowStock]        = useState([])
  const [expiring, setExpiring]        = useState([])
  const [allItems, setAllItems]        = useState([])
  const [loading, setLoading]          = useState(true)
  const [error, setError]              = useState(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [allRes, lowRes, expiringRes] = await Promise.all([
        inventoryApi.getAll().catch(err => { console.error(err); return { data: { data: [] } }; }),
        inventoryApi.getLowStock().catch(err => { console.error(err); return { data: { data: [] } }; }),
        batchesApi.getExpiring(60).catch(err => { console.error(err); return { data: { data: [] } }; }),
      ])
      setAllItems(allRes.data?.data ?? [])
      setLowStock(lowRes.data?.data ?? [])
      setExpiring(expiringRes.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load procurement data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const outOfStock    = allItems.filter(i => (Number(i.quantityOnHand) || 0) === 0)
  const criticalItems = [...outOfStock, ...lowStock.filter(i => !outOfStock.find(o => o.inventoryId === i.inventoryId))]
  const expiringCount = expiring.length
  const totalProducts = allItems.length
  const needsReorder  = criticalItems.length

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Procurement Overview</h1>
          <p>Monitor reorder alerts, expiring stock, and items requiring procurement action</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            {loading ? 'Refreshing…' : 'Refresh'}
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
          <StatCard label="Total Products" value={totalProducts.toLocaleString()} subtext="Tracked across all locations" icon={ProductsIcon} variant="primary" />
          <StatCard label="Needs Reorder" value={needsReorder.toLocaleString()} subtext={needsReorder > 0 ? 'Items at or below reorder point' : 'All levels healthy'} icon={AlertCircleIcon} variant={needsReorder > 0 ? 'danger' : 'success'} />
          <StatCard label="Out of Stock" value={outOfStock.length.toLocaleString()} subtext={outOfStock.length > 0 ? 'Requires immediate action' : 'No depleted items'} icon={StockIcon} variant={outOfStock.length > 0 ? 'danger' : 'success'} />
          <StatCard label="Expiring (60d)" value={expiringCount.toLocaleString()} subtext={expiringCount > 0 ? 'Batches expiring within 60 days' : 'No near-expiry batches'} icon={ClockIcon} variant={expiringCount > 0 ? 'warning' : 'success'} />
        </div>
      )}

      {!loading && !error && criticalItems.length > 0 && (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Procurement Action Required</span>
              <span className="count-badge">{criticalItems.length} items</span>
            </div>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Items at or below reorder point that require procurement attention
            </p>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Branch</th>
                  <th style={{ textAlign: 'right' }}>On Hand</th>
                  <th style={{ textAlign: 'right' }}>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {criticalItems.map(item => {
                  const qty = Number(item.quantityOnHand) || 0
                  const isOut = qty === 0
                  return (
                    <tr key={item.inventoryId} className={isOut ? 'row-danger' : 'row-warning'}>
                      <td><strong style={{ color: 'var(--color-text)' }}>{item.productName}</strong></td>
                      <td><span className="sku-pill">{item.sku}</span></td>
                      <td>{item.branchName}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong style={{ color: isOut ? 'var(--color-danger)' : 'var(--color-warning)' }}>{qty.toLocaleString()}</strong>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                        {(Number(item.reorderLevel) || 0).toLocaleString()}
                      </td>
                      <td>
                        <Badge variant={isOut ? 'danger' : 'warning'}>{isOut ? 'Out of Stock' : 'Low Stock'}</Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && criticalItems.length === 0 && (
        <div className="table-card">
          <EmptyState title="All Stock Levels Healthy" description="No items currently require procurement action. All inventory is at or above reorder levels." />
        </div>
      )}

      {!loading && !error && expiring.length > 0 && (
        <div className="table-card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Expiring Batches (Next 60 Days)</span>
              <span className="count-badge">{expiring.length} batches</span>
            </div>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch #</th>
                  <th>Branch</th>
                  <th style={{ textAlign: 'right' }}>Qty Remaining</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expiring.map(batch => {
                  const daysLeft = Math.ceil((new Date(batch.expiryDate) - new Date()) / 86400000)
                  return (
                    <tr key={batch.batchId} className={daysLeft <= 14 ? 'row-danger' : 'row-warning'}>
                      <td><strong>{batch.productName}</strong></td>
                      <td><span className="sku-pill">{batch.batchNumber}</span></td>
                      <td>{batch.branchName}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{(Number(batch.remainingQuantity) || 0).toLocaleString()}</td>
                      <td>{new Date(batch.expiryDate).toLocaleDateString()}</td>
                      <td><Badge variant={daysLeft <= 14 ? 'danger' : 'warning'}>{daysLeft}d left</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
