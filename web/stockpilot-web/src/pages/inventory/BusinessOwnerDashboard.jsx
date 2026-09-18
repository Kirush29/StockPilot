// BusinessOwnerDashboard.jsx — Full inventory overview for Business Owner role
import React, { useState, useEffect, useCallback } from 'react'
import { inventoryApi, batchesApi } from '../../api/inventoryApi'
import StatCard from '../../components/ui/StatCard'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { CardSkeleton, TableSkeleton } from '../../components/ui/Skeleton'
import {
  SearchIcon,
  RefreshIcon,
  ProductsIcon,
  StockIcon,
  AlertCircleIcon,
  ClockIcon,
  CloseIcon,
} from '../../components/ui/Icons'
import AiInsightsWidget from '../../components/ui/AiInsightsWidget'
import '../../styles/inventory.css'

export default function BusinessOwnerDashboard() {
  const [allItems, setAllItems]           = useState([])
  const [lowStock, setLowStock]           = useState([])
  const [expiringBatches, setExpiring]    = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [searchTerm, setSearchTerm]       = useState('')
  const [searching, setSearching]         = useState(false)
  const [searchResults, setSearchResults] = useState(null)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [allRes, lowRes, expiringRes] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getLowStock(),
        batchesApi.getExpiring(30).catch(() => ({ data: { data: [] } })),
      ])
      setAllItems(allRes.data?.data ?? [])
      setLowStock(lowRes.data?.data ?? [])
      setExpiring(expiringRes.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load inventory data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleSearch = async (e) => {
    e.preventDefault()
    const term = searchTerm.trim()
    if (!term) {
      setSearchResults(null)
      return
    }
    setSearching(true)
    try {
      const res = await inventoryApi.search(term)
      setSearchResults(res.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? 'Search query failed.')
    } finally {
      setSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSearchResults(null)
  }

  // Derived real metric calculations
  const totalItems    = allItems.length
  const totalQty      = allItems.reduce((sum, i) => sum + (Number(i.quantityOnHand) || 0), 0)
  const lowStockCount = lowStock.length
  const outOfStock    = allItems.filter(i => (Number(i.quantityOnHand) || 0) === 0).length
  const expiringCount = expiringBatches.length

  const tableData     = searchResults ?? allItems
  const isFiltered    = searchResults !== null

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Business Overview</h1>
          <p>Complete inventory health, stock levels, and alerts across all branches</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Error Banner if error occurs while data is already loaded ─────── */}
      {error && allItems.length > 0 && (
        <ErrorState error={error} onRetry={fetchDashboard} inline />
      )}

      <AiInsightsWidget />

      {/* ── Metric Summary Cards ─────────────────────────────────────────── */}
      {loading ? (
        <div className="stat-grid">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !error || allItems.length > 0 ? (
        <div className="stat-grid">
          <StatCard
            label="Total Products Tracked"
            value={totalItems.toLocaleString()}
            subtext="Across all branch locations"
            icon={ProductsIcon}
            variant="primary"
          />
          <StatCard
            label="Total Units On Hand"
            value={totalQty.toLocaleString()}
            subtext="Available & reserved stock"
            icon={StockIcon}
            variant="success"
          />
          <StatCard
            label="Low Stock Alert"
            value={lowStockCount.toLocaleString()}
            subtext={lowStockCount > 0 ? 'Items below reorder point' : 'All stock levels healthy'}
            icon={AlertCircleIcon}
            variant={lowStockCount > 0 ? 'warning' : 'success'}
          />
          <StatCard
            label="Out of Stock"
            value={outOfStock.toLocaleString()}
            subtext={outOfStock > 0 ? 'Requires replenishment' : 'No depleted inventory items'}
            icon={AlertCircleIcon}
            variant={outOfStock > 0 ? 'danger' : 'success'}
          />
          {expiringCount > 0 && (
            <StatCard
              label="Expiring Batches"
              value={expiringCount.toLocaleString()}
              subtext="Within the next 30 days"
              icon={ClockIcon}
              variant="warning"
            />
          )}
        </div>
      ) : null}

      {/* ── Search & Filter Toolbar ─────────────────────────────────────── */}
      {!loading && (allItems.length > 0 || isFiltered) && (
        <form className="toolbar-card" onSubmit={handleSearch}>
          <div className="toolbar-left">
            <div className="search-input-group">
              <SearchIcon />
              <input
                className="search-input"
                type="text"
                placeholder="Search products by name, SKU, or keyword…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  <CloseIcon style={{ width: 14, height: 14 }} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={searching}
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
            {isFiltered && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClearSearch}
              >
                Clear Search
              </button>
            )}
          </div>
        </form>
      )}

      {/* ── Stock Health Table / Loading / Error State ───────────────────── */}
      {loading ? (
        <TableSkeleton rows={6} columns={7} title="Loading inventory overview…" />
      ) : error && allItems.length === 0 ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={fetchDashboard} />
        </div>
      ) : tableData.length === 0 ? (
        <div className="table-card">
          <EmptyState
            title={isFiltered ? 'No search results found' : 'No inventory records found'}
            description={
              isFiltered
                ? `No products match "${searchTerm}". Try another keyword or clear the search.`
                : 'There are currently no items tracked in the inventory.'
            }
            actionLabel={isFiltered ? 'Clear Search' : undefined}
            onAction={isFiltered ? handleClearSearch : undefined}
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Stock Overview</span>
              <span className="count-badge">
                {tableData.length} {tableData.length === 1 ? 'item' : 'items'}
              </span>
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
                  <th style={{ textAlign: 'right' }}>Reserved</th>
                  <th style={{ textAlign: 'right' }}>Available</th>
                  <th>Health Status</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(item => {
                  const qty = Number(item.quantityOnHand) || 0
                  const reorder = Number(item.reorderLevel) || 0
                  const isOut = qty === 0
                  const isLow = qty <= reorder

                  let rowClass = ''
                  let badgeVariant = 'success'
                  let badgeLabel = 'Healthy'

                  if (isOut) {
                    rowClass = 'row-danger'
                    badgeVariant = 'danger'
                    badgeLabel = 'Out of Stock'
                  } else if (isLow) {
                    rowClass = 'row-warning'
                    badgeVariant = 'warning'
                    badgeLabel = 'Low Stock'
                  }

                  return (
                    <tr key={item.inventoryId} className={rowClass}>
                      <td>
                        <strong style={{ color: 'var(--color-text)' }}>{item.productName}</strong>
                      </td>
                      <td>
                        <span className="sku-pill">{item.sku}</span>
                      </td>
                      <td>{item.branchName}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong style={{ color: isOut ? 'var(--color-danger)' : 'inherit' }}>
                          {qty.toLocaleString()}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                        {(Number(item.reservedQuantity) || 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{(Number(item.availableQuantity) || 0).toLocaleString()}</strong>
                      </td>
                      <td>
                        <Badge variant={badgeVariant}>{badgeLabel}</Badge>
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
