import { useState, useEffect, useCallback } from 'react'
import { movementsApi, productsApi, inventoryApi } from '../../api/inventoryApi'
import '../../styles/inventory.css'

// ── Movement types permitted for manual adjustment by the backend ────────────
export const ADJUSTMENT_MOVEMENT_TYPES = [
  { value: 2, label: 'Adjustment Increase', key: 'AdjustmentIncrease' },
  { value: 3, label: 'Adjustment Decrease', key: 'AdjustmentDecrease' },
  { value: 6, label: 'Damage',              key: 'Damage' },
  { value: 8, label: 'Return',              key: 'Return' },
]

// Mapping for friendly display names across all movement types
const MOVEMENT_TYPE_LABELS = {
  0: 'Receive',
  1: 'Sale',
  2: 'Adjustment Increase',
  3: 'Adjustment Decrease',
  4: 'Transfer Out',
  5: 'Transfer In',
  6: 'Damage',
  7: 'Expiry',
  8: 'Return',
  Receive: 'Receive',
  Sale: 'Sale',
  AdjustmentIncrease: 'Adjustment Increase',
  AdjustmentDecrease: 'Adjustment Decrease',
  TransferOut: 'Transfer Out',
  TransferIn: 'Transfer In',
  Damage: 'Damage',
  Expiry: 'Expiry',
  Return: 'Return',
}

function getMovementTypeLabel(type) {
  return MOVEMENT_TYPE_LABELS[type] ?? String(type)
}

function MovementTypeBadge({ type }) {
  const label = getMovementTypeLabel(type)
  const norm = String(type).toLowerCase()

  if (norm.includes('increase') || norm === 'receive' || norm === 'return' || norm === 'transferin' || norm === '2' || norm === '0' || norm === '5' || norm === '8') {
    return <span className="badge badge-ok">{label}</span>
  }
  if (norm.includes('damage') || norm.includes('expiry') || norm === '6' || norm === '7') {
    return <span className="badge badge-critical">{label}</span>
  }
  return <span className="badge badge-low">{label}</span>
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Adjustment Form Modal ───────────────────────────────────────────────────
const EMPTY_ADJUSTMENT_FORM = {
  productId: '',
  branchId: '',
  movementType: '2',
  quantity: '',
  reference: '',
  notes: '',
}

function AdjustmentModal({ products, branches, onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY_ADJUSTMENT_FORM)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState(null)

  const set = (field, value) => {
    setForm(p => ({ ...p, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.productId) e.productId = 'Product is required.'
    if (!form.branchId) e.branchId = 'Branch is required.'
    if (!form.movementType) e.movementType = 'Movement type is required.'
    const qty = parseFloat(form.quantity)
    if (form.quantity === '' || isNaN(qty) || qty <= 0) {
      e.quantity = 'Quantity must be greater than 0.'
    }
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    setApiError(null)

    // Construct reason combining reference and notes if provided
    const reasonParts = []
    if (form.reference.trim()) reasonParts.push(`Ref: ${form.reference.trim()}`)
    if (form.notes.trim()) reasonParts.push(form.notes.trim())
    const combinedReason = reasonParts.join(' - ') || null

    const payload = {
      productId: form.productId,
      branchId: form.branchId,
      movementType: Number(form.movementType),
      quantity: Number(form.quantity),
      reason: combinedReason,
    }

    try {
      const response = await movementsApi.createAdjustment(payload)
      onSuccess(response.data?.message ?? 'Stock adjustment recorded successfully.')
      onClose()
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setApiError('Access denied. Authentication required. (AUTH-INTEGRATION-POINT)')
      } else {
        setApiError(err.response?.data?.message ?? 'Failed to record stock adjustment.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Record Stock Adjustment</h2>
          <button className="modal-close" onClick={onClose} disabled={submitting}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {apiError && <div className="error-box">⚠ {apiError}</div>}

            {/* Product */}
            <div className="form-group">
              <label>
                Product <span className="required">*</span>
              </label>
              <select
                className={`form-control ${errors.productId ? 'error' : ''}`}
                value={form.productId}
                onChange={e => set('productId', e.target.value)}
                disabled={submitting}
              >
                <option value="">Select a product…</option>
                {products.map(p => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              {errors.productId && <span className="form-error">{errors.productId}</span>}
            </div>

            {/* Branch */}
            <div className="form-group">
              <label>
                Branch <span className="required">*</span>
              </label>
              <select
                className={`form-control ${errors.branchId ? 'error' : ''}`}
                value={form.branchId}
                onChange={e => set('branchId', e.target.value)}
                disabled={submitting}
              >
                <option value="">Select a branch…</option>
                {branches.map(b => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.branchName}
                  </option>
                ))}
              </select>
              {errors.branchId && <span className="form-error">{errors.branchId}</span>}
            </div>

            {/* Movement Type & Quantity */}
            <div className="form-row">
              <div className="form-group">
                <label>
                  Movement Type <span className="required">*</span>
                </label>
                <select
                  className={`form-control ${errors.movementType ? 'error' : ''}`}
                  value={form.movementType}
                  onChange={e => set('movementType', e.target.value)}
                  disabled={submitting}
                >
                  {ADJUSTMENT_MOVEMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {errors.movementType && <span className="form-error">{errors.movementType}</span>}
              </div>

              <div className="form-group">
                <label>
                  Quantity <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="0.0001"
                  step="any"
                  className={`form-control ${errors.quantity ? 'error' : ''}`}
                  placeholder="e.g. 5"
                  value={form.quantity}
                  onChange={e => set('quantity', e.target.value)}
                  disabled={submitting}
                />
                {errors.quantity && <span className="form-error">{errors.quantity}</span>}
              </div>
            </div>

            {/* Reference */}
            <div className="form-group">
              <label>Reference</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. AUDIT-2026-09 or PO-1234"
                value={form.reference}
                onChange={e => set('reference', e.target.value)}
                disabled={submitting}
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label>Notes</label>
              <textarea
                className="form-control"
                placeholder="Reason or additional details for this adjustment…"
                rows={3}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Recording…' : 'Record Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Stock Movements Page Component ─────────────────────────────────────
export default function StockMovementsPage() {
  const [movements, setMovements] = useState([])
  const [products, setProducts]   = useState([])
  const [branches, setBranches]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Filters
  const [productFilter, setProductFilter] = useState('')
  const [branchFilter, setBranchFilter]   = useState('')
  const [searchTerm, setSearchTerm]       = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)

  // Fetch movements based on active filters
  const fetchMovements = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let res
      if (productFilter && !branchFilter) {
        res = await movementsApi.getByProduct(productFilter)
      } else if (branchFilter && !productFilter) {
        res = await movementsApi.getByBranch(branchFilter)
      } else {
        res = await movementsApi.getAll()
      }

      const list = res.data?.data ?? []
      setMovements(list)

      // Collect any branches discovered from movements if not yet known
      setBranches(prev => {
        const branchMap = new Map(prev.map(b => [b.branchId, b]))
        list.forEach(m => {
          if (m.branchId && m.branchName && !branchMap.has(m.branchId)) {
            branchMap.set(m.branchId, { branchId: m.branchId, branchName: m.branchName })
          }
        })
        return Array.from(branchMap.values())
      })
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setError('Access denied. Authentication required. (AUTH-INTEGRATION-POINT)')
      } else {
        setError(err.response?.data?.message ?? 'Failed to load stock movements.')
      }
    } finally {
      setLoading(false)
    }
  }, [productFilter, branchFilter])

  // Load products and branches initial options
  useEffect(() => {
    productsApi.getAll(true)
      .then(res => setProducts(res.data?.data ?? []))
      .catch(() => {})

    inventoryApi.getAll()
      .then(res => {
        const items = res.data?.data ?? []
        const branchMap = new Map()
        items.forEach(i => {
          if (i.branchId && i.branchName && !branchMap.has(i.branchId)) {
            branchMap.set(i.branchId, { branchId: i.branchId, branchName: i.branchName })
          }
        })
        setBranches(prev => {
          const merged = new Map(prev.map(b => [b.branchId, b]))
          branchMap.forEach((v, k) => merged.set(k, v))
          return Array.from(merged.values())
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  // Handle successful adjustment
  const handleAdjustmentSuccess = (message) => {
    setSuccessMsg(message)
    fetchMovements()
    setTimeout(() => {
      setSuccessMsg(null)
    }, 5000)
  }

  // Combined client-side filtering for search and dual-selected filters
  const filteredMovements = movements.filter(m => {
    // If both product and branch filters were selected, getByProduct / getAll may need branch match
    if (productFilter && m.productId !== productFilter) return false
    if (branchFilter && m.branchId !== branchFilter) return false

    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      (m.productName && m.productName.toLowerCase().includes(q)) ||
      (m.sku && m.sku.toLowerCase().includes(q)) ||
      (m.branchName && m.branchName.toLowerCase().includes(q)) ||
      (m.movementType && String(m.movementType).toLowerCase().includes(q)) ||
      (m.referenceType && m.referenceType.toLowerCase().includes(q)) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(q)) ||
      (m.reason && m.reason.toLowerCase().includes(q))
    )
  })

  const handleResetFilters = () => {
    setProductFilter('')
    setBranchFilter('')
    setSearchTerm('')
  }

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Stock Movements</h1>
          <p>Audit trail of all inventory receipts, sales, adjustments, and transfers</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={fetchMovements} disabled={loading}>
            ↻ Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Record Adjustment
          </button>
        </div>
      </div>

      {/* ── Success Feedback Banner ─────────────────────────────────────── */}
      {successMsg && (
        <div
          style={{
            background: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: 'var(--radius)',
            padding: 'var(--space-4)',
            color: '#15803d',
            fontSize: 'var(--font-size-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-5)',
          }}
        >
          <span>✓ {successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontWeight: 600 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div className="search-bar">
        <input
          className="search-input"
          placeholder="Search by product, SKU, reference, notes…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />

        {/* Product Filter */}
        <select
          className="form-control"
          style={{ flex: '0 0 200px' }}
          value={productFilter}
          onChange={e => setProductFilter(e.target.value)}
        >
          <option value="">All Products</option>
          {products.map(p => (
            <option key={p.productId} value={p.productId}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Branch Filter */}
        <select
          className="form-control"
          style={{ flex: '0 0 200px' }}
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
        >
          <option value="">All Branches</option>
          {branches.map(b => (
            <option key={b.branchId} value={b.branchId}>
              {b.branchName}
            </option>
          ))}
        </select>

        {(productFilter || branchFilter || searchTerm) && (
          <button className="btn btn-secondary" onClick={handleResetFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────── */}
      {error && (
        <div className="error-box">
          <span>⚠ {error}</span>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={fetchMovements}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Movements Table Card ───────────────────────────────────────── */}
      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">
            Movement Log {!loading && `(${filteredMovements.length})`}
          </span>
        </div>

        {loading ? (
          <div className="state-container">
            <div className="spinner" />
            <p>Loading stock movements…</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="state-container">
            <p>
              {searchTerm || productFilter || branchFilter
                ? 'No stock movements match the selected filters.'
                : 'No stock movements recorded yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Branch</th>
                  <th>Movement Type</th>
                  <th>Quantity</th>
                  <th>Previous Qty</th>
                  <th>New Qty</th>
                  <th>Reference</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map(m => (
                  <tr key={m.stockMovementId}>
                    {/* Date */}
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {formatDateTime(m.createdAt)}
                    </td>

                    {/* Product */}
                    <td>
                      <strong>{m.productName}</strong>
                      {m.sku && (
                        <div>
                          <small style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                            {m.sku}
                          </small>
                        </div>
                      )}
                    </td>

                    {/* Branch */}
                    <td>{m.branchName}</td>

                    {/* Movement Type */}
                    <td>
                      <MovementTypeBadge type={m.movementType} />
                    </td>

                    {/* Quantity */}
                    <td>
                      <strong>
                        {m.newQuantity > m.previousQuantity ? `+${m.quantity}` : `-${m.quantity}`}
                      </strong>
                    </td>

                    {/* Previous Quantity */}
                    <td>{m.previousQuantity}</td>

                    {/* New Quantity */}
                    <td>
                      <strong>{m.newQuantity}</strong>
                    </td>

                    {/* Reference */}
                    <td style={{ fontSize: '0.8rem' }}>
                      {m.referenceType ? (
                        <span>
                          {m.referenceType}
                          {m.referenceId && (
                            <span style={{ color: 'var(--color-text-muted)' }}> #{m.referenceId}</span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Notes */}
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '240px' }}>
                      {m.reason || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Adjustment Modal ───────────────────────────────────────────── */}
      {showModal && (
        <AdjustmentModal
          products={products}
          branches={branches}
          onClose={() => setShowModal(false)}
          onSuccess={handleAdjustmentSuccess}
        />
      )}
    </div>
  )
}
