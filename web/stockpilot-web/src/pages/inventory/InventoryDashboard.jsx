import { useState, useEffect, useCallback } from 'react'
import { inventoryApi } from '../../api/inventoryApi'
import '../../styles/inventory.css'

// ── Small reusable components ─────────────────────────────────────────────────

function StatCard({ label, value, variant }) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${variant ?? ''}`}>{value}</div>
    </div>
  )
}

function StockBadge({ qty, reorderLevel }) {
  if (qty === 0)              return <span className="badge badge-critical">Out of stock</span>
  if (qty <= reorderLevel)    return <span className="badge badge-low">Low stock</span>
  return                             <span className="badge badge-ok">OK</span>
}

function LoadingState() {
  return (
    <div className="state-container">
      <div className="spinner" />
      <p>Loading inventory…</p>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="state-container">
      <div className="error-box" style={{ marginBottom: 0 }}>
        ⚠ {message}
      </div>
      <button className="btn btn-secondary" onClick={onRetry}>Retry</button>
    </div>
  )
}

function EmptyState({ filtered }) {
  return (
    <div className="state-container">
      <p>{filtered ? 'No inventory items match your search.' : 'No inventory records found.'}</p>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function InventoryDashboard() {
  const [allItems, setAllItems]       = useState([])
  const [lowStock, setLowStock]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [searchTerm, setSearchTerm]   = useState('')
  const [searching, setSearching]     = useState(false)
  const [searchResults, setSearchResults] = useState(null) // null = not searched yet

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [allRes, lowRes] = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getLowStock(),
      ])
      setAllItems(allRes.data?.data ?? [])
      setLowStock(lowRes.data?.data ?? [])
    } catch (err) {
      const msg = err.response?.data?.message
        ?? err.message
        ?? 'Failed to load inventory data.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // Search handler — calls /api/inventory/search
  const handleSearch = async (e) => {
    e.preventDefault()
    const term = searchTerm.trim()
    if (!term) { setSearchResults(null); return }
    setSearching(true)
    try {
      const res = await inventoryApi.search(term)
      setSearchResults(res.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? 'Search failed.')
    } finally {
      setSearching(false)
    }
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setSearchResults(null)
  }

  // Derived stats
  const totalItems    = allItems.length
  const totalQty      = allItems.reduce((sum, i) => sum + (i.quantityOnHand ?? 0), 0)
  const lowStockCount = lowStock.length
  const outOfStock    = allItems.filter(i => i.quantityOnHand === 0).length

  // Table data — search results override full list
  const tableData     = searchResults ?? allItems
  const isFiltered    = searchResults !== null

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Inventory Dashboard</h1>
          <p>Overview of current stock levels across all branches</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchDashboard}
          disabled={loading}
        >
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="error-box">
          ⚠ {error}
          <button
            className="btn btn-secondary"
            style={{ marginLeft: 'auto' }}
            onClick={fetchDashboard}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      {!loading && !error && (
        <div className="stat-grid">
          <StatCard label="Total Products Tracked" value={totalItems} />
          <StatCard
            label="Total Quantity On Hand"
            value={totalQty.toLocaleString()}
          />
          <StatCard
            label="Low Stock Items"
            value={lowStockCount}
            variant={lowStockCount > 0 ? 'warning' : ''}
          />
          <StatCard
            label="Out of Stock"
            value={outOfStock}
            variant={outOfStock > 0 ? 'danger' : ''}
          />
        </div>
      )}

      {/* Search */}
      {!loading && (
        <form className="search-bar" onSubmit={handleSearch}>
          <input
            className="search-input"
            type="text"
            placeholder="Search by product name or SKU…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </button>
          {isFiltered && (
            <button className="btn btn-secondary" type="button" onClick={handleClearSearch}>
              Clear
            </button>
          )}
        </form>
      )}

      {/* Inventory table */}
      {loading ? (
        <LoadingState />
      ) : error && allItems.length === 0 ? (
        <ErrorState message={error} onRetry={fetchDashboard} />
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">
              {isFiltered
                ? `Search results (${tableData.length})`
                : `All Inventory (${tableData.length})`}
            </span>
          </div>

          {tableData.length === 0 ? (
            <EmptyState filtered={isFiltered} />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Branch</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(item => (
                  <tr key={item.inventoryId}>
                    <td>{item.productName}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                      {item.sku}
                    </td>
                    <td>{item.branchName}</td>
                    <td>{item.quantityOnHand}</td>
                    <td>{item.reservedQuantity}</td>
                    <td><strong>{item.availableQuantity}</strong></td>
                    <td>
                      <StockBadge
                        qty={item.quantityOnHand}
                        reorderLevel={item.reorderLevel}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
