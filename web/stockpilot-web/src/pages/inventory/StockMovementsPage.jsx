// StockMovementsPage.jsx — Polished SaaS Inventory Audit & Movements Log
import React, { useState, useEffect, useCallback } from 'react'
import { movementsApi, productsApi, inventoryApi } from '../../api/inventoryApi'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { TableSkeleton } from '../../components/ui/Skeleton'
import {
  PlusIcon,
  SearchIcon,
  RefreshIcon,
  CloseIcon,
  AlertCircleIcon,
  HistoryIcon,
} from '../../components/ui/Icons'
import '../../styles/inventory.css'

// ── Movement types permitted for manual adjustment by the backend ────────────
const ADJUSTMENT_MOVEMENT_TYPES = [
  { value: 2, label: 'Adjustment Increase', key: 'AdjustmentIncrease' },
  { value: 3, label: 'Adjustment Decrease', key: 'AdjustmentDecrease' },
  { value: 6, label: 'Damage',              key: 'Damage' },
  { value: 8, label: 'Return',              key: 'Return' },
]

const ALL_MOVEMENT_FILTER_OPTIONS = [
  { value: '',                   label: 'All Movement Types' },
  { value: 'Receive',            label: 'Receive' },
  { value: 'Sale',               label: 'Sale' },
  { value: 'AdjustmentIncrease', label: 'Adjustment Increase' },
  { value: 'AdjustmentDecrease', label: 'Adjustment Decrease' },
  { value: 'TransferIn',         label: 'Transfer In' },
  { value: 'TransferOut',        label: 'Transfer Out' },
  { value: 'Damage',             label: 'Damage' },
  { value: 'Expiry',             label: 'Expiry' },
  { value: 'Return',             label: 'Return' },
]

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
    return <Badge variant="success">{label}</Badge>
  }
  if (norm.includes('damage') || norm.includes('expiry') || norm === '6' || norm === '7') {
    return <Badge variant="danger">{label}</Badge>
  }
  return <Badge variant="warning">{label}</Badge>
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
  const [form, setForm]         = useState(EMPTY_ADJUSTMENT_FORM)
  const [errors, setErrors]     = useState({})
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
    <Modal
      title="Record Stock Adjustment"
      subtitle="Manually adjust quantity on hand for increases, write-offs, or returns"
      onClose={onClose}
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {apiError && (
            <div className="error-banner">
              <div className="error-banner-content">
                <AlertCircleIcon />
                <span>{apiError}</span>
              </div>
            </div>
          )}

          {/* Product */}
          <div className="form-group">
            <label>Product <span className="required">*</span></label>
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
            <label>Branch <span className="required">*</span></label>
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
              <label>Movement Type <span className="required">*</span></label>
              <select
                className={`form-control ${errors.movementType ? 'error' : ''}`}
                value={form.movementType}
                onChange={e => set('movementType', e.target.value)}
                disabled={submitting}
              >
                {ADJUSTMENT_MOVEMENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.movementType && <span className="form-error">{errors.movementType}</span>}
            </div>

            <div className="form-group">
              <label>Quantity <span className="required">*</span></label>
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
            <label>Reference #</label>
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
            <label>Notes / Reason</label>
            <textarea
              className="form-control"
              placeholder="Provide context or explanation for this stock adjustment…"
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
    </Modal>
  )
}

// ── Main Stock Movements Page Component ─────────────────────────────────────
export default function StockMovementsPage() {
  const [movements, setMovements]   = useState([])
  const [products, setProducts]     = useState([])
  const [branches, setBranches]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Filters
  const [productFilter, setProductFilter]   = useState('')
  const [branchFilter, setBranchFilter]     = useState('')
  const [typeFilter, setTypeFilter]         = useState('')
  const [searchTerm, setSearchTerm]         = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)

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

  const handleAdjustmentSuccess = (message) => {
    setSuccessMsg(message)
    fetchMovements()
    setTimeout(() => setSuccessMsg(null), 5000)
  }

  const filteredMovements = movements.filter(m => {
    if (productFilter && m.productId !== productFilter) return false
    if (branchFilter && m.branchId !== branchFilter) return false
    if (typeFilter && String(m.movementType) !== typeFilter) return false

    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      (m.productName && m.productName.toLowerCase().includes(q)) ||
      (m.sku && m.sku.toLowerCase().includes(q)) ||
      (m.branchName && m.branchName.toLowerCase().includes(q)) ||
      (m.referenceType && m.referenceType.toLowerCase().includes(q)) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(q)) ||
      (m.reason && m.reason.toLowerCase().includes(q))
    )
  })

  const handleResetFilters = () => {
    setProductFilter('')
    setBranchFilter('')
    setTypeFilter('')
    setSearchTerm('')
  }

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Stock Movements</h1>
          <p>Audit trail of all inventory changes, transfers, sales, and manual adjustments</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchMovements}
            disabled={loading}
          >
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            <PlusIcon />
            Record Adjustment
          </button>
        </div>
      </div>

      {/* ── Success Feedback Banner ─────────────────────────────────────── */}
      {successMsg && (
        <div className="success-banner">
          <span>✓ {successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            style={{ color: 'inherit', fontWeight: 600 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Error Banner ───────────────────────────────────────────────── */}
      {error && movements.length > 0 && (
        <ErrorState error={error} onRetry={fetchMovements} inline />
      )}

      {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
      <div className="toolbar-card">
        <div className="toolbar-left">
          <div className="search-input-group">
            <SearchIcon />
            <input
              className="search-input"
              type="text"
              placeholder="Search by product, SKU, reference, notes…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <CloseIcon style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          <select
            className="form-control"
            style={{ flex: '0 0 180px' }}
            value={productFilter}
            onChange={e => setProductFilter(e.target.value)}
          >
            <option value="">All Products</option>
            {products.map(p => (
              <option key={p.productId} value={p.productId}>{p.name}</option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ flex: '0 0 180px' }}
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.branchId} value={b.branchId}>{b.branchName}</option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ flex: '0 0 180px' }}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            {ALL_MOVEMENT_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {(productFilter || branchFilter || typeFilter || searchTerm) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleResetFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table Card / Skeletons / State ─────────────────────────────── */}
      {loading ? (
        <TableSkeleton rows={7} columns={9} title="Loading inventory movements log…" />
      ) : error && movements.length === 0 ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={fetchMovements} />
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={HistoryIcon}
            title={
              searchTerm || productFilter || branchFilter || typeFilter
                ? 'No movements match your filters'
                : 'No stock movements recorded yet'
            }
            description={
              searchTerm || productFilter || branchFilter || typeFilter
                ? 'Try adjusting or clearing your filters to see more results.'
                : 'Inventory adjustments, transfers, and order receipts will be logged here.'
            }
            actionLabel={
              searchTerm || productFilter || branchFilter || typeFilter
                ? 'Reset Filters'
                : 'Record Adjustment'
            }
            actionIcon={
              searchTerm || productFilter || branchFilter || typeFilter
                ? undefined
                : PlusIcon
            }
            onAction={
              searchTerm || productFilter || branchFilter || typeFilter
                ? handleResetFilters
                : () => setShowModal(true)
            }
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Movement Log</span>
              <span className="count-badge">{filteredMovements.length} records</span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Product</th>
                  <th>Branch</th>
                  <th>Movement Type</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Previous Stock</th>
                  <th style={{ textAlign: 'right' }}>New Stock</th>
                  <th>Reference</th>
                  <th>Notes / Reason</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map(m => {
                  const isIncrease = Number(m.newQuantity) >= Number(m.previousQuantity)
                  return (
                    <tr key={m.stockMovementId}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--color-text)' }}>{m.productName}</strong>
                        {m.sku && (
                          <div>
                            <span className="sku-pill" style={{ fontSize: '0.6875rem' }}>
                              {m.sku}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>{m.branchName}</td>
                      <td>
                        <MovementTypeBadge type={m.movementType} />
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong style={{ color: isIncrease ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {isIncrease ? `+${Number(m.quantity).toLocaleString()}` : `-${Number(m.quantity).toLocaleString()}`}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                        {Number(m.previousQuantity).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{Number(m.newQuantity).toLocaleString()}</strong>
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)' }}>
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
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', maxWidth: '260px' }}>
                        {m.reason || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
