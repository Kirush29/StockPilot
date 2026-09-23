// BatchesPage.jsx — Polished SaaS Batch & Expiry Management
import React, { useState, useEffect, useCallback } from 'react'
import { batchesApi, productsApi } from '../../../api/inventoryApi'
import Modal from '../../../components/ui/Modal'
import StatCard from '../../../components/ui/StatCard'
import Badge from '../../../components/ui/Badge'
import EmptyState from '../../../components/ui/EmptyState'
import ErrorState from '../../../components/ui/ErrorState'
import { TableSkeleton } from '../../../components/ui/Skeleton'
import {
  PlusIcon,
  SearchIcon,
  RefreshIcon,
  EditIcon,
  CloseIcon,
  AlertCircleIcon,
  ClockIcon,
  BatchesIcon,
} from '../../../components/ui/Icons'
import { formatCurrency } from '../../../utils/currencyFormatter'
import '../../../styles/inventory.css'

const BATCH_STATUSES = ['Active', 'Expired', 'Damaged', 'Depleted']

const EMPTY_BATCH_FORM = {
  productId: '',
  branchId: '',
  batchNumber: '',
  quantity: '',
  unitCost: '',
  manufacturingDate: '',
  expiryDate: '',
  receivedDate: '',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function toInputDate(dateStr) {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toISOString().split('T')[0]
  } catch {
    return ''
  }
}

function getExpiryNotice(expiryDateStr, isExpired) {
  if (!expiryDateStr) return null
  const now = new Date()
  const exp = new Date(expiryDateStr)
  const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))

  if (isExpired || diffDays <= 0) {
    return <span style={{ color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 600 }}>Expired</span>
  }
  if (diffDays <= 30) {
    return <span style={{ color: 'var(--color-warning)', fontSize: '0.75rem', fontWeight: 600 }}>In {diffDays} days</span>
  }
  return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{diffDays} days left</span>
}

// ── Add / Edit Batch Modal ──────────────────────────────────────────────────
function BatchModal({ batch, products, onClose, onSaved }) {
  const isEdit = !!batch
  const [form, setForm] = useState(() =>
    isEdit
      ? {
          productId: batch.productId,
          branchId: batch.branchId,
          batchNumber: batch.batchNumber,
          quantity: String(batch.quantity),
          unitCost: String(batch.unitCost ?? ''),
          manufacturingDate: toInputDate(batch.manufacturingDate),
          expiryDate: toInputDate(batch.expiryDate),
          receivedDate: toInputDate(batch.receivedDate),
          status: batch.status,
        }
      : { ...EMPTY_BATCH_FORM, status: 'Active' }
  )
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [apiError, setApiError] = useState(null)

  const set = (f, v) => {
    setForm(p => ({ ...p, [f]: v }))
    setErrors(e => ({ ...e, [f]: undefined }))
  }

  function validate() {
    const e = {}
    if (!form.productId) e.productId = 'Product is required.'
    if (!form.branchId) e.branchId = 'Branch ID is required.'
    if (!form.batchNumber.trim()) e.batchNumber = 'Batch number is required.'
    if (form.quantity === '' || isNaN(Number(form.quantity)) || Number(form.quantity) < 0) {
      e.quantity = 'Quantity must be 0 or greater.'
    }
    if (!form.expiryDate) {
      e.expiryDate = 'Expiry date is required.'
    } else if (isNaN(new Date(form.expiryDate).getTime())) {
      e.expiryDate = 'Invalid expiry date.'
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    setApiError(null)
    try {
      const payload = {
        productId: form.productId,
        branchId: form.branchId,
        batchNumber: form.batchNumber.trim(),
        quantity: Number(form.quantity),
        unitCost: Number(form.unitCost) || 0,
        manufacturingDate: form.manufacturingDate || null,
        expiryDate: form.expiryDate || null,
        receivedDate: form.receivedDate || null,
      }

      if (isEdit) {
        await batchesApi.update(batch.batchId, {
          quantity: payload.quantity,
          unitCost: payload.unitCost,
          manufacturingDate: payload.manufacturingDate,
          expiryDate: payload.expiryDate,
          status: form.status,
        })
      } else {
        await batchesApi.create(payload)
      }
      onSaved(isEdit ? 'Batch updated successfully.' : 'Batch created successfully.')
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setApiError('Access denied. Authentication required. (AUTH-INTEGRATION-POINT)')
      } else {
        setApiError(err.response?.data?.message ?? 'Failed to save batch.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Edit Batch' : 'Add New Batch'}
      subtitle={isEdit ? `Batch #${batch.batchNumber}` : 'Register a new lot/batch for inventory tracking'}
      onClose={onClose}
      maxWidth="600px"
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

          {!isEdit && (
            <>
              {/* Product */}
              <div className="form-group">
                <label>Product <span className="required">*</span></label>
                <select
                  className={`form-control ${errors.productId ? 'error' : ''}`}
                  value={form.productId}
                  onChange={e => set('productId', e.target.value)}
                  disabled={saving}
                >
                  <option value="">Select a product…</option>
                  {products.map(p => (
                    <option key={p.productId} value={p.productId}>{p.name} ({p.sku})</option>
                  ))}
                </select>
                {errors.productId && <span className="form-error">{errors.productId}</span>}
              </div>

              {/* Branch & Batch Number */}
              <div className="form-row">
                <div className="form-group">
                  <label>Branch ID / UUID <span className="required">*</span></label>
                  <input
                    type="text"
                    className={`form-control ${errors.branchId ? 'error' : ''}`}
                    placeholder="Enter or paste branch UUID…"
                    value={form.branchId}
                    onChange={e => set('branchId', e.target.value)}
                    disabled={saving}
                  />
                  {errors.branchId && <span className="form-error">{errors.branchId}</span>}
                </div>

                <div className="form-group">
                  <label>Batch / Lot # <span className="required">*</span></label>
                  <input
                    type="text"
                    className={`form-control ${errors.batchNumber ? 'error' : ''}`}
                    placeholder="e.g. LOT-2026-001"
                    value={form.batchNumber}
                    onChange={e => set('batchNumber', e.target.value)}
                    disabled={saving}
                  />
                  {errors.batchNumber && <span className="form-error">{errors.batchNumber}</span>}
                </div>
              </div>
            </>
          )}

          {/* Quantity & Unit Cost */}
          <div className="form-row">
            <div className="form-group">
              <label>Quantity <span className="required">*</span></label>
              <input
                type="number"
                min="0"
                step="any"
                className={`form-control ${errors.quantity ? 'error' : ''}`}
                value={form.quantity}
                onChange={e => set('quantity', e.target.value)}
                placeholder="0"
                disabled={saving}
              />
              {errors.quantity && <span className="form-error">{errors.quantity}</span>}
            </div>

            <div className="form-group">
              <label>Unit Cost (Rs.)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-control"
                value={form.unitCost}
                onChange={e => set('unitCost', e.target.value)}
                placeholder="0.00"
                disabled={saving}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="form-row">
            <div className="form-group">
              <label>Mfg Date</label>
              <input
                type="date"
                className="form-control"
                value={form.manufacturingDate}
                onChange={e => set('manufacturingDate', e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label>Expiry Date <span className="required">*</span></label>
              <input
                type="date"
                className={`form-control ${errors.expiryDate ? 'error' : ''}`}
                value={form.expiryDate}
                onChange={e => set('expiryDate', e.target.value)}
                disabled={saving}
              />
              {errors.expiryDate && <span className="form-error">{errors.expiryDate}</span>}
            </div>
          </div>

          {!isEdit ? (
            <div className="form-group">
              <label>Received Date</label>
              <input
                type="date"
                className="form-control"
                value={form.receivedDate}
                onChange={e => set('receivedDate', e.target.value)}
                disabled={saving}
              />
            </div>
          ) : (
            <div className="form-group">
              <label>Batch Status</label>
              <select
                className="form-control"
                value={form.status}
                onChange={e => set('status', e.target.value)}
                disabled={saving}
              >
                {BATCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Batch'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Batches Page ───────────────────────────────────────────────────────
export default function BatchesPage() {
  const [batches, setBatches]       = useState([])
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [filter, setFilter]         = useState('all') // all | expiring | expired
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(null)  // null | { batch? }

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let res
      if (filter === 'expiring') res = await batchesApi.getExpiring(30)
      else if (filter === 'expired') res = await batchesApi.getExpired()
      else res = await batchesApi.getAll()
      setBatches(res.data?.data ?? [])
    } catch (e) {
      const status = e.response?.status
      if (status === 401 || status === 403) {
        setError('Access denied. Authentication required. (AUTH-INTEGRATION-POINT)')
      } else {
        setError(e.response?.data?.message ?? 'Failed to load batches.')
      }
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    productsApi.getAll(false).then(r => setProducts(r.data?.data ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    fetchBatches()
  }, [fetchBatches])

  const showToast = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleSaved = (msg) => {
    setModal(null)
    showToast(msg || 'Batch saved successfully.')
    fetchBatches()
  }

  // Real KPI calculations from batches
  const totalBatches = batches.length
  const expiringBatchesCount = batches.filter(b => b.isExpiringSoon && !b.isExpired).length
  const expiredBatchesCount  = batches.filter(b => b.isExpired || b.status === 'Expired').length

  const visible = batches.filter(b => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (b.batchNumber && b.batchNumber.toLowerCase().includes(q)) ||
      (b.productName && b.productName.toLowerCase().includes(q)) ||
      (b.sku && b.sku.toLowerCase().includes(q)) ||
      (b.branchName && b.branchName.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Batches & Expiry Tracking</h1>
          <p>Monitor lot numbers, shelf life, expiration windows, and batch quantities</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchBatches}
            disabled={loading}
          >
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModal({})}
          >
            <PlusIcon />
            Add Batch
          </button>
        </div>
      </div>

      {/* ── Success Banner ─────────────────────────────────────────────── */}
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
      {error && batches.length > 0 && (
        <ErrorState error={error} onRetry={fetchBatches} inline />
      )}

      {/* ── Summary KPI Cards ───────────────────────────────────────────── */}
      {!error && batches.length > 0 && (
        <div className="stat-grid">
          <StatCard
            label="Total Active Batches"
            value={totalBatches.toLocaleString()}
            subtext="Tracked across all facilities"
            icon={BatchesIcon}
            variant="primary"
          />
          <StatCard
            label="Expiring Soon (< 30d)"
            value={expiringBatchesCount.toLocaleString()}
            subtext={expiringBatchesCount > 0 ? 'Requires priority rotation' : 'No near-term expirations'}
            icon={ClockIcon}
            variant={expiringBatchesCount > 0 ? 'warning' : 'success'}
          />
          <StatCard
            label="Expired Lots"
            value={expiredBatchesCount.toLocaleString()}
            subtext={expiredBatchesCount > 0 ? 'Requires disposal or adjustment' : 'Zero expired stock'}
            icon={AlertCircleIcon}
            variant={expiredBatchesCount > 0 ? 'danger' : 'success'}
          />
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="toolbar-card">
        <div className="toolbar-left">
          <div className="search-input-group">
            <SearchIcon />
            <input
              className="search-input"
              type="text"
              placeholder="Search batch #, product, or branch…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <CloseIcon style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons */}
          <div className="filter-pills">
            <button
              type="button"
              className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Batches
            </button>
            <button
              type="button"
              className={`filter-pill ${filter === 'expiring' ? 'active' : ''}`}
              onClick={() => setFilter('expiring')}
            >
              Expiring Soon
            </button>
            <button
              type="button"
              className={`filter-pill ${filter === 'expired' ? 'active' : ''}`}
              onClick={() => setFilter('expired')}
            >
              Expired
            </button>
          </div>

          {search && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setSearch('')}
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* ── Table / State ──────────────────────────────────────────────── */}
      {loading ? (
        <TableSkeleton rows={6} columns={8} title="Loading batches inventory…" />
      ) : error && batches.length === 0 ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={fetchBatches} />
        </div>
      ) : visible.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={BatchesIcon}
            title={
              filter === 'expiring'
                ? 'No expiring batches'
                : filter === 'expired'
                ? 'No expired batches'
                : search
                ? 'No matching batches found'
                : 'No batches registered yet'
            }
            description={
              filter === 'expiring'
                ? 'Great! There are no product lots expiring within the next 30 days.'
                : filter === 'expired'
                ? 'No expired batches were detected in the system.'
                : search
                ? `No batches match "${search}".`
                : 'Get started by creating your first product batch.'
            }
            actionLabel={filter === 'all' && !search ? 'Add Batch' : 'Reset Filters'}
            actionIcon={filter === 'all' && !search ? PlusIcon : undefined}
            onAction={filter === 'all' && !search ? () => setModal({}) : () => { setFilter('all'); setSearch('') }}
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>
                {filter === 'expiring'
                  ? 'Expiring Soon (< 30 Days)'
                  : filter === 'expired'
                  ? 'Expired Batches'
                  : 'All Batches'}
              </span>
              <span className="count-badge">{visible.length} batches</span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Product</th>
                  <th>Branch</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Unit Cost</th>
                  <th>Mfg Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(b => {
                  const isExp = b.isExpired || b.status === 'Expired'
                  const isExpSoon = b.isExpiringSoon && !isExp

                  let rowClass = ''
                  let badgeVariant = 'active'
                  let badgeText = b.status || 'Active'

                  if (isExp) {
                    rowClass = 'row-danger'
                    badgeVariant = 'expired'
                    badgeText = 'Expired'
                  } else if (isExpSoon) {
                    rowClass = 'row-warning'
                    badgeVariant = 'expiring_soon'
                    badgeText = 'Expiring Soon'
                  }

                  return (
                    <tr key={b.batchId} className={rowClass}>
                      <td>
                        <span className="sku-pill" style={{ fontWeight: 600 }}>
                          {b.batchNumber}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--color-text)' }}>{b.productName}</strong>
                        {b.sku && <div><small style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{b.sku}</small></div>}
                      </td>
                      <td>{b.branchName}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{Number(b.quantity).toLocaleString()}</strong>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-text-muted)' }}>
                        {formatCurrency(b.unitCost)}
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {formatDate(b.manufacturingDate)}
                      </td>
                      <td>
                        <div>{formatDate(b.expiryDate)}</div>
                        {getExpiryNotice(b.expiryDate, isExp)}
                      </td>
                      <td>
                        <Badge variant={badgeVariant}>{badgeText}</Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setModal({ batch: b })}
                          >
                            <EditIcon />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ───────────────────────────────────────────── */}
      {modal !== null && (
        <BatchModal
          batch={modal.batch ?? null}
          products={products}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
