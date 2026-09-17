// StockLevelsPage.jsx — Polished SaaS Stock Health & Inventory Levels
import React, { useState, useEffect, useCallback } from 'react'
import { inventoryApi, productsApi } from '../../../api/inventoryApi'
import StatCard from '../../../components/ui/StatCard'
import Badge from '../../../components/ui/Badge'
import EmptyState from '../../../components/ui/EmptyState'
import ErrorState from '../../../components/ui/ErrorState'
import { CardSkeleton, TableSkeleton } from '../../../components/ui/Skeleton'
import {
  SearchIcon,
  RefreshIcon,
  StockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CloseIcon,
} from '../../../components/ui/Icons'
import '../../../styles/inventory.css'

export default function StockLevelsPage() {
  const [rows, setRows]                   = useState([])
  const [products, setProducts]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [search, setSearch]               = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [lowStockOnly, setLowStockOnly]   = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let res
      if (lowStockOnly) {
        res = await inventoryApi.getLowStock()
      } else if (search.trim()) {
        res = await inventoryApi.search(search.trim())
      } else {
        res = await inventoryApi.getAll()
      }
      setRows(res.data?.data ?? [])
    } catch (e) {
      const status = e.response?.status
      if (status === 401 || status === 403) {
        setError('Access denied. Authentication required. (AUTH-INTEGRATION-POINT)')
      } else {
        setError(e.response?.data?.message ?? 'Failed to load stock levels.')
      }
    } finally {
      setLoading(false)
    }
  }, [lowStockOnly, search])

  useEffect(() => {
    productsApi.getAll(true)
      .then(r => setProducts(r.data?.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleSearch = (e) => {
    e.preventDefault()
    fetchAll()
  }

  // Derived real summary metrics
  const totalStockUnits = rows.reduce((sum, r) => sum + (Number(r.quantityOnHand) || 0), 0)
  const outOfStockCount = rows.filter(r => (Number(r.quantityOnHand) || 0) === 0).length
  const lowStockCount   = rows.filter(r => {
    const qty = Number(r.quantityOnHand) || 0
    const reorder = Number(r.reorderLevel) || 0
    return qty > 0 && (r.isLowStock || qty <= reorder)
  }).length
  const healthyCount    = rows.filter(r => {
    const qty = Number(r.quantityOnHand) || 0
    const reorder = Number(r.reorderLevel) || 0
    return qty > reorder
  }).length

  const visible = rows.filter(r => {
    if (productFilter && r.productId !== productFilter) return false
    return true
  })

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Stock Levels</h1>
          <p>Real-time inventory levels, reorder thresholds, and stock health monitoring</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchAll}
            disabled={loading}
          >
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────── */}
      {error && rows.length > 0 && (
        <ErrorState error={error} onRetry={fetchAll} inline />
      )}

      {/* ── Real Summary Cards ─────────────────────────────────────────── */}
      {loading ? (
        <div className="stat-grid">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : rows.length > 0 ? (
        <div className="stat-grid">
          <StatCard
            label="Total Stock Units"
            value={totalStockUnits.toLocaleString()}
            subtext="Across all branch locations"
            icon={StockIcon}
            variant="primary"
          />
          <StatCard
            label="Healthy Stock"
            value={healthyCount.toLocaleString()}
            subtext="Stock safely above reorder level"
            icon={CheckCircleIcon}
            variant="success"
          />
          <StatCard
            label="Low Stock Items"
            value={lowStockCount.toLocaleString()}
            subtext={lowStockCount > 0 ? 'Requires replenishment soon' : 'No low stock warnings'}
            icon={AlertCircleIcon}
            variant={lowStockCount > 0 ? 'warning' : 'success'}
          />
          <StatCard
            label="Out of Stock"
            value={outOfStockCount.toLocaleString()}
            subtext={outOfStockCount > 0 ? 'Urgent: zero inventory on hand' : 'No stockouts detected'}
            icon={AlertCircleIcon}
            variant={outOfStockCount > 0 ? 'danger' : 'success'}
          />
        </div>
      ) : null}

      {/* ── Search & Filter Toolbar ─────────────────────────────────────── */}
      <form className="toolbar-card" onSubmit={handleSearch}>
        <div className="toolbar-left">
          <div className="search-input-group">
            <SearchIcon />
            <input
              className="search-input"
              type="text"
              placeholder="Search by product name or SKU…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              disabled={lowStockOnly}
            />
            {search && !lowStockOnly && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => { setSearch(''); fetchAll() }}
                aria-label="Clear search"
              >
                <CloseIcon style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          <select
            className="form-control"
            style={{ flex: '0 0 200px' }}
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
          >
            <option value="">All Products</option>
            {products.map(p => (
              <option key={p.productId} value={p.productId}>{p.name}</option>
            ))}
          </select>

          {/* Low Stock Toggle Pill */}
          <button
            type="button"
            className={`btn ${lowStockOnly ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => { setLowStockOnly(!lowStockOnly); setSearch('') }}
          >
            <AlertCircleIcon />
            {lowStockOnly ? 'Showing Low Stock Only' : 'Low Stock Only'}
          </button>

          {!lowStockOnly && (
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              Search
            </button>
          )}

          {(search || productFilter || lowStockOnly) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setProductFilter(''); setLowStockOnly(false) }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </form>

      {/* ── Table / State ──────────────────────────────────────────────── */}
      {loading ? (
        <TableSkeleton rows={6} columns={8} title="Loading inventory stock levels…" />
      ) : error && rows.length === 0 ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={fetchAll} />
        </div>
      ) : visible.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={StockIcon}
            title={lowStockOnly ? 'No low stock items' : 'No stock records found'}
            description={
              lowStockOnly
                ? 'All inventory items are currently at or above healthy stock levels.'
                : 'No inventory stock records matched your search or filters.'
            }
            actionLabel={lowStockOnly || productFilter || search ? 'Reset Filters' : undefined}
            onAction={
              lowStockOnly || productFilter || search
                ? () => { setSearch(''); setProductFilter(''); setLowStockOnly(false) }
                : undefined
            }
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>{lowStockOnly ? 'Low Stock Alerts' : 'Stock Levels'}</span>
              <span className="count-badge">{visible.length} records</span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Branch</th>
                  <th style={{ textAlign: 'right' }}>On Hand</th>
                  <th style={{ textAlign: 'right' }}>Available</th>
                  <th style={{ textAlign: 'right' }}>Reserved</th>
                  <th style={{ textAlign: 'right' }}>Reorder Lvl</th>
                  <th style={{ textAlign: 'right' }}>Min Lvl</th>
                  <th>Stock Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(r => {
                  const qty = Number(r.quantityOnHand) || 0
                  const reorder = Number(r.reorderLevel) || 0
                  const isOut = qty === 0
                  const isLow = r.isLowStock || qty <= reorder

                  let rowClass = ''
                  let badgeVariant = 'healthy'
                  let badgeText = 'Healthy'

                  if (isOut) {
                    rowClass = 'row-danger'
                    badgeVariant = 'danger'
                    badgeText = 'Out of Stock'
                  } else if (isLow) {
                    rowClass = 'row-warning'
                    badgeVariant = 'warning'
                    badgeText = 'Low Stock'
                  }

                  return (
                    <tr key={r.inventoryId} className={rowClass}>
                      <td>
                        <strong style={{ color: 'var(--color-text)' }}>{r.productName}</strong>
                      </td>
                      <td>
                        <span className="sku-pill">{r.sku}</span>
                      </td>
                      <td>{r.branchName}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong style={{ color: isOut ? 'var(--color-danger)' : 'inherit' }}>
                          {qty.toLocaleString()}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{(Number(r.availableQuantity) || 0).toLocaleString()}</strong>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                        {(Number(r.reservedQuantity) || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {reorder.toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {(Number(r.minimumStockLevel) || 0).toLocaleString()}
                      </td>
                      <td>
                        <Badge variant={badgeVariant}>{badgeText}</Badge>
                      </td>
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
