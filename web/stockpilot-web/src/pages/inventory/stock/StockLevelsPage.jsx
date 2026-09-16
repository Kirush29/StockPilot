import { useState, useEffect, useCallback } from 'react'
import { inventoryApi, productsApi } from '../../../api/inventoryApi'
import '../../../styles/inventory.css'

function StockBadge({ item }) {
  if (item.quantityOnHand === 0)
    return <span className="badge badge-critical">Out of Stock</span>
  if (item.isLowStock)
    return <span className="badge badge-low">Low Stock</span>
  return <span className="badge badge-ok">In Stock</span>
}

export default function StockLevelsPage() {
  const [rows, setRows]           = useState([])
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [search, setSearch]       = useState('')
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

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSearch = e => {
    e.preventDefault()
    fetchAll()
  }

  const visible = rows.filter(r => {
    if (productFilter && r.productId !== productFilter) return false
    return true
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Stock Levels</h1>
          <p>Current inventory quantities across all branches</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchAll} disabled={loading}>
          ↻ Refresh
        </button>
      </div>

      <form className="search-bar" onSubmit={handleSearch}>
        <input
          className="search-input"
          placeholder="Search product or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          disabled={lowStockOnly}
        />
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={e => { setLowStockOnly(e.target.checked); setSearch('') }}
          />
          Low stock only
        </label>
        {!lowStockOnly && (
          <button className="btn btn-primary" type="submit" disabled={loading}>Search</button>
        )}
      </form>

      {error && <div className="error-box">⚠ {error}</div>}

      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">
            {lowStockOnly ? 'Low Stock Items' : 'All Stock Levels'}
            {!loading && ` (${visible.length})`}
          </span>
        </div>

        {loading ? (
          <div className="state-container"><div className="spinner" /></div>
        ) : visible.length === 0 ? (
          <div className="state-container"><p>No stock records found.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Branch</th>
                <th>On Hand</th>
                <th>Available</th>
                <th>Reserved</th>
                <th>Reorder Level</th>
                <th>Min Level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(r => (
                <tr key={r.inventoryId}>
                  <td>{r.productName}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>{r.sku}</td>
                  <td>{r.branchName}</td>
                  <td><strong>{r.quantityOnHand}</strong></td>
                  <td>{r.availableQuantity}</td>
                  <td>{r.reservedQuantity}</td>
                  <td>{r.reorderLevel}</td>
                  <td>{r.minimumStockLevel}</td>
                  <td><StockBadge item={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
