// TransfersPage.jsx — Full inter-branch stock transfer management
import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { transfersApi, branchesApi, productsApi, inventoryApi, optimizationApi } from '../../api/inventoryApi'
import { useAuth } from '../../shared/auth/AuthContext'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { FormInput, SearchableDropdown } from '../../components/ui/FormControls'
import { RefreshIcon, TransfersIcon, CloseIcon, AlertCircleIcon, CheckCircleIcon } from '../../components/ui/Icons'
import '../../shared/theme/inventory.css'

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_VARIANT = {
  Pending:   'warning',
  Approved:  'info',
  Shipped:   'primary',
  Received:  'success',
  Rejected:  'danger',
  Cancelled: 'default',
}

const ALL_STATUSES = ['Pending', 'Approved', 'Shipped', 'Received', 'Rejected', 'Cancelled']

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

// ── Create Transfer Modal ─────────────────────────────────────────────────────

function CreateTransferModal({ branches, products, onClose, onCreated, prefill, user }) {
  const isBranchScoped = (user?.role === 'BranchManager' || user?.role === 'StoreEmployee') && !!user?.branchId
  const userBranchId = user?.branchId || ''

  const [sourceBranchId, setSourceBranchId]           = useState(prefill?.sourceBranchId || '')
  const [destinationBranchId, setDestinationBranchId] = useState(
    prefill?.destinationBranchId || (isBranchScoped ? userBranchId : '')
  )
  const [notes, setNotes]                             = useState(prefill?.reason || '')
  const [items, setItems]                             = useState(
    prefill?.productId
      ? [{ productId: prefill.productId, requestedQuantity: prefill.quantity || '' }]
      : [{ productId: '', requestedQuantity: '' }]
  )
  const [availableStock, setAvailableStock]           = useState({})
  const [submitting, setSubmitting]                   = useState(false)
  const [error, setError]                             = useState(null)
  const [errors, setErrors]                           = useState({})

  // Initialize stock for prefill if source is given
  useEffect(() => {
    if (prefill?.sourceBranchId && prefill?.productId) {
      loadStock(prefill.sourceBranchId, prefill.productId, 0)
    }
  }, [prefill])

  // Fetch available inventory for source branch when product + source branch change
  const loadStock = useCallback(async (branchId, productId, idx) => {
    if (!branchId || !productId) return
    try {
      const res = await inventoryApi.getByBranchAndProduct(branchId, productId)
      setAvailableStock(prev => ({ ...prev, [`${idx}`]: res.data?.data }))
    } catch {
      setAvailableStock(prev => ({ ...prev, [`${idx}`]: null }))
    }
  }, [])

  const handleItemChange = (idx, field, value) => {
    const next = items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    setItems(next)
    if ((field === 'productId' || field === 'requestedQuantity') && sourceBranchId) {
      const productId = field === 'productId' ? value : next[idx].productId
      loadStock(sourceBranchId, productId, idx)
    }
  }

  const handleSourceChange = (branchId) => {
    setSourceBranchId(branchId)
    items.forEach((item, idx) => {
      if (item.productId) loadStock(branchId, item.productId, idx)
    })
  }

  const addItem = () => setItems(prev => [...prev, { productId: '', requestedQuantity: '' }])
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!sourceBranchId || !destinationBranchId) {
      setError('Please select both source and destination branches.')
      return
    }
    if (sourceBranchId === destinationBranchId) {
      setError('Source and destination branches cannot be the same.')
      return
    }
    if (isBranchScoped && sourceBranchId !== userBranchId && destinationBranchId !== userBranchId) {
      setError('You can only create transfers involving your assigned branch (as source or destination).')
      return
    }
    for (const [i, item] of items.entries()) {
      if (!item.productId) { setError(`Row ${i + 1}: Please select a product.`); return }
      if (!item.requestedQuantity || Number(item.requestedQuantity) <= 0) {
        setError(`Row ${i + 1}: Quantity must be greater than 0.`); return
      }
    }

    setSubmitting(true)
    setErrors({})
    try {
      await transfersApi.create({
        sourceBranchId,
        destinationBranchId,
        notes: notes || null,
        items: items.map(it => ({
          productId: it.productId,
          requestedQuantity: Number(it.requestedQuantity),
        })),
      })
      onCreated()
      onClose()
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        const serverMsg =
          err.response?.data?.errorMessage ||
          err.response?.data?.ErrorMessage ||
          err.response?.data?.message ||
          err.response?.data?.detail ||
          err.message ||
          'Failed to create transfer.';
        setError(serverMsg);
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Create Stock Transfer</h2>
            <p className="modal-subtitle">Request stock to be moved between branches</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 'var(--space-4)' }}>
                {error}
              </div>
            )}

            {isBranchScoped && (
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', background: 'var(--color-bg-alt)', padding: '6px 10px', borderRadius: '4px' }}>
                ℹ️ Branch policy: This transfer must involve your assigned branch ({branches.find(b => (b.branchId ?? b.id) === userBranchId)?.name || 'Assigned Branch'}) as either source or destination.
              </div>
            )}

            <div className="form-row">
              <div style={{ flex: 1 }}>
                <SearchableDropdown
                  label="Source Branch"
                  required
                  options={branches}
                  value={sourceBranchId}
                  onChange={handleSourceChange}
                  error={errors.sourceBranchId || (errors.SourceBranchId ? errors.SourceBranchId[0] : null)}
                  placeholder="— Select source branch —"
                  getOptionValue={(opt) => opt.branchId ?? opt.id}
                  renderOption={(opt) => `${opt.name} (${opt.branchCode || opt.code || ''})`}
                />
              </div>
              <div style={{ flex: 1 }}>
                <SearchableDropdown
                  label="Destination Branch"
                  required
                  options={branches.filter(b => (b.branchId ?? b.id) !== sourceBranchId)}
                  value={destinationBranchId}
                  onChange={setDestinationBranchId}
                  error={errors.destinationBranchId || (errors.DestinationBranchId ? errors.DestinationBranchId[0] : null)}
                  placeholder="— Select destination branch —"
                  getOptionValue={(opt) => opt.branchId ?? opt.id}
                  renderOption={(opt) => `${opt.name} (${opt.branchCode || opt.code || ''})`}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ct-notes">Notes <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85em', marginLeft: '4px' }}>(Optional)</span></label>
              <textarea id="ct-notes" className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this transfer request…" />
            </div>

            <div className="form-section-label">Transfer Items</div>

            {items.map((item, idx) => {
              const stock = availableStock[`${idx}`]
              return (
                <div key={idx} className="transfer-item-row">
                  <div className="transfer-item-fields">
                    <div style={{ flex: 2 }}>
                      <SearchableDropdown
                        label="Product"
                        required
                        options={products}
                        value={item.productId}
                        onChange={(val) => handleItemChange(idx, 'productId', val)}
                        error={errors[`Items[${idx}].ProductId`] ? errors[`Items[${idx}].ProductId`][0] : null}
                        placeholder="— Select product —"
                        getOptionValue={(opt) => opt.productId ?? opt.id}
                        renderOption={(opt) => `${opt.name} (${opt.sku || 'SKU'})`}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <FormInput
                        label={
                          <span>
                            Quantity
                            {stock && (
                              <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.6875rem', marginLeft: 6 }}>
                                Available: {Number(stock.availableQuantity).toLocaleString()}
                              </span>
                            )}
                          </span>
                        }
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.requestedQuantity}
                        onChange={e => handleItemChange(idx, 'requestedQuantity', e.target.value)}
                        error={errors[`Items[${idx}].RequestedQuantity`] ? errors[`Items[${idx}].RequestedQuantity`][0] : null}
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button type="button" className="transfer-item-remove" onClick={() => removeItem(idx)} aria-label="Remove item">
                      <CloseIcon style={{ width: 14, height: 14 }} />
                    </button>
                  )}
                </div>
              )
            })}

            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
              + Add Another Product
            </button>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Transfer Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Transfer Detail Modal ─────────────────────────────────────────────────────

function TransferDetailModal({ transfer, userRole, onClose, onAction }) {
  const [action, setAction]         = useState(null) // 'approve'|'reject'|'ship'|'receive'|'cancel'
  const [rejectionReason, setRej]   = useState('')
  const [approvedQtys, setAQ]       = useState({})
  const [receivedQtys, setRQ]       = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)
  const [errors, setErrors]         = useState({})

  useEffect(() => {
    if (transfer) {
      const aq = {}, rq = {}
      transfer.items?.forEach(it => {
        aq[it.stockTransferItemId] = it.approvedQuantity ?? it.requestedQuantity
        rq[it.stockTransferItemId] = it.shippedQuantity ?? it.approvedQuantity ?? it.requestedQuantity
      })
      setAQ(aq)
      setRQ(rq)
    }
  }, [transfer])

  if (!transfer) return null

  const canApprove = ['BranchManager','ProcurementManager'].includes(userRole) && transfer.status === 'Pending'
  const canReject  = ['BranchManager','ProcurementManager'].includes(userRole) && transfer.status === 'Pending'
  const canShip    = ['BranchManager','StoreEmployee'].includes(userRole) && transfer.status === 'Approved'
  const canReceive = ['BranchManager','StoreEmployee'].includes(userRole) && transfer.status === 'Shipped'
  const canCancel  = ['BranchManager','ProcurementManager'].includes(userRole) && ['Pending','Approved'].includes(transfer.status)

  const handleConfirm = async () => {
    setError(null)
    setErrors({})
    setSubmitting(true)
    try {
      if (action === 'approve') {
        const itemsPayload = transfer.items.map(it => ({
          stockTransferItemId: it.stockTransferItemId,
          approvedQuantity: Number(approvedQtys[it.stockTransferItemId] ?? it.requestedQuantity),
        }))
        await transfersApi.approve(transfer.stockTransferId, { items: itemsPayload })
      } else if (action === 'reject') {
        if (!rejectionReason.trim()) { setError('Please provide a rejection reason.'); setSubmitting(false); return }
        await transfersApi.reject(transfer.stockTransferId, { rejectionReason })
      } else if (action === 'ship') {
        await transfersApi.ship(transfer.stockTransferId)
      } else if (action === 'receive') {
        const itemsPayload = transfer.items.map(it => ({
          stockTransferItemId: it.stockTransferItemId,
          receivedQuantity: Number(receivedQtys[it.stockTransferItemId] ?? it.shippedQuantity ?? it.approvedQuantity),
        }))
        await transfersApi.receive(transfer.stockTransferId, { items: itemsPayload })
      } else if (action === 'cancel') {
        await transfersApi.cancel(transfer.stockTransferId)
      }
      onAction()
      onClose()
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setError(err.response?.data?.message ?? err.message ?? 'Action failed.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 4 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>{transfer.transferNumber}</h2>
              <Badge variant={STATUS_VARIANT[transfer.status] ?? 'default'}>{transfer.status}</Badge>
            </div>
            <p className="modal-subtitle">{transfer.sourceBranchName} → {transfer.destinationBranchName}</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-danger" style={{ marginBottom: 'var(--space-4)' }}>{error}</div>}

          {/* Transfer metadata */}
          <div className="detail-grid">
            <div className="detail-cell"><span>Requested by</span><strong>{transfer.requestedByName}</strong></div>
            <div className="detail-cell"><span>Requested at</span><strong>{fmt(transfer.requestedAt)}</strong></div>
            {transfer.approvedByName && <div className="detail-cell"><span>Approved by</span><strong>{transfer.approvedByName}</strong></div>}
            {transfer.approvedAt && <div className="detail-cell"><span>Approved at</span><strong>{fmt(transfer.approvedAt)}</strong></div>}
            {transfer.shippedAt && <div className="detail-cell"><span>Shipped at</span><strong>{fmt(transfer.shippedAt)}</strong></div>}
            {transfer.receivedAt && <div className="detail-cell"><span>Received at</span><strong>{fmt(transfer.receivedAt)}</strong></div>}
            {transfer.notes && <div className="detail-cell" style={{ gridColumn: '1/-1' }}><span>Notes</span><strong>{transfer.notes}</strong></div>}
            {transfer.rejectionReason && <div className="detail-cell" style={{ gridColumn: '1/-1' }}><span>Rejection Reason</span><strong style={{ color: 'var(--color-danger)' }}>{transfer.rejectionReason}</strong></div>}
          </div>

          {/* Items table */}
          <div className="form-section-label" style={{ marginTop: 'var(--space-4)' }}>Transfer Items</div>
          <div className="data-table-container" style={{ marginTop: 'var(--space-2)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>Requested</th>
                  {action === 'approve' ? (
                    <th style={{ textAlign: 'right' }}>Approve Qty</th>
                  ) : (
                    <th style={{ textAlign: 'right' }}>Approved</th>
                  )}
                  <th style={{ textAlign: 'right' }}>Shipped</th>
                  {action === 'receive' ? (
                    <th style={{ textAlign: 'right' }}>Receive Qty</th>
                  ) : (
                    <th style={{ textAlign: 'right' }}>Received</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {transfer.items?.map(it => (
                  <tr key={it.stockTransferItemId}>
                    <td><strong>{it.productName}</strong></td>
                    <td><span className="sku-pill">{it.sku}</span></td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Number(it.requestedQuantity).toLocaleString()}</td>
                    {action === 'approve' ? (
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: 90, display: 'inline-block', padding: '4px 8px', textAlign: 'right' }}
                          min="0"
                          max={it.requestedQuantity}
                          step="0.01"
                          value={approvedQtys[it.stockTransferItemId] ?? it.requestedQuantity}
                          onChange={e => setAQ(prev => ({ ...prev, [it.stockTransferItemId]: e.target.value }))}
                        />
                      </td>
                    ) : (
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: it.approvedQuantity ? 'inherit' : 'var(--color-text-dim)' }}>
                        {it.approvedQuantity != null ? Number(it.approvedQuantity).toLocaleString() : '—'}
                      </td>
                    )}
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: it.shippedQuantity ? 'inherit' : 'var(--color-text-dim)' }}>
                      {it.shippedQuantity != null ? Number(it.shippedQuantity).toLocaleString() : '—'}
                    </td>
                    {action === 'receive' ? (
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          className="form-control"
                          style={{ width: 90, display: 'inline-block', padding: '4px 8px', textAlign: 'right' }}
                          min="0"
                          max={it.shippedQuantity ?? it.approvedQuantity}
                          step="0.01"
                          value={receivedQtys[it.stockTransferItemId] ?? it.shippedQuantity ?? it.approvedQuantity ?? it.requestedQuantity}
                          onChange={e => setRQ(prev => ({ ...prev, [it.stockTransferItemId]: e.target.value }))}
                        />
                      </td>
                    ) : (
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: it.receivedQuantity ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                        {it.receivedQuantity != null ? Number(it.receivedQuantity).toLocaleString() : '—'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action sub-panel */}
          {action === 'reject' && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <FormInput
                label="Rejection Reason"
                required
                type="text"
                value={rejectionReason}
                onChange={e => setRej(e.target.value)}
                placeholder="Explain why this transfer is being rejected…"
                error={errors.rejectionReason || (errors.RejectionReason ? errors.RejectionReason[0] : null)}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          {/* Role-based action buttons */}
          {!action && (
            <>
              {canApprove && (
                <button type="button" className="btn btn-success" onClick={() => setAction('approve')}>Approve</button>
              )}
              {canReject && (
                <button type="button" className="btn btn-danger-outline" onClick={() => setAction('reject')}>Reject</button>
              )}
              {canShip && (
                <button type="button" className="btn btn-primary" onClick={() => setAction('ship')}>Mark as Shipped</button>
              )}
              {canReceive && (
                <button type="button" className="btn btn-success" onClick={() => setAction('receive')}>Confirm Receipt</button>
              )}
              {canCancel && (
                <button type="button" className="btn btn-danger-outline" onClick={() => setAction('cancel')}>Cancel Transfer</button>
              )}
              <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            </>
          )}
          {action && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => { setAction(null); setError(null) }} disabled={submitting}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={handleConfirm} disabled={submitting}>
                {submitting ? 'Processing…' : `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── TransfersPage ─────────────────────────────────────────────────────────────

export default function TransfersPage() {
  const location = useLocation()
  const { user }  = useAuth()
  const userRole  = user?.role ?? ''

  const canCreate = ['BranchManager', 'BusinessOwner', 'ProcurementManager', 'StoreEmployee'].includes(userRole)
  const canReviewAi = ['BusinessOwner', 'ProcurementManager', 'BranchManager'].includes(userRole)

  const [transfers, setTransfers]                 = useState([])
  const [branches, setBranches]                   = useState([])
  const [products, setProducts]                   = useState([])
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [approvingRecId, setApprovingRecId]       = useState(null)
  const [rejectingRecId, setRejectingRecId]       = useState(null)
  const [aiActionMessage, setAiActionMessage]     = useState(null)
  const [aiActionError, setAiActionError]         = useState(null)
  const [loading, setLoading]                     = useState(true)
  const [error, setError]                         = useState(null)
  const [statusFilter, setStatusFilter]           = useState('all')

  const initialPrefill = location.state?.prefill
  const [showCreate, setShowCreate]       = useState(!!initialPrefill)
  const [selectedTransfer, setSelected]   = useState(null)

  // Clear prefill state so it doesn't re-open on reload
  useEffect(() => {
    if (initialPrefill) {
      window.history.replaceState({}, '')
    }
  }, [initialPrefill])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [trRes, brRes, prRes, recRes] = await Promise.all([
        transfersApi.getAll(),
        branchesApi.getAll().catch(() => ({ data: [] })),
        productsApi.getAll().catch(() => ({ data: [] })),
        optimizationApi.getRecommendations().catch(() => ({ data: [] })),
      ])
      setTransfers(trRes.data?.data ?? trRes.data ?? [])
      setBranches(brRes.data?.data ?? brRes.data ?? [])
      setProducts(prRes.data?.data ?? prRes.data ?? [])
      const recs = recRes.data?.data ?? recRes.data ?? []
      const pendingTransfers = Array.isArray(recs)
        ? recs.filter(r => 
            (r.status === 'PendingReview' || r.status === 0) &&
            (r.recommendationType === 'Transfer' || r.recommendationType === 0)
          )
        : []
      setAiRecommendations(pendingTransfers)
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load transfers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleApproveRecommendation = async (recId) => {
    setApprovingRecId(recId)
    setAiActionError(null)
    setAiActionMessage(null)
    try {
      await optimizationApi.approve(recId)
      setAiActionMessage('AI transfer recommendation approved! Transfer request created successfully.')
      await fetchAll()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to approve transfer recommendation.'
      setAiActionError(msg)
    } finally {
      setApprovingRecId(null)
    }
  }

  const handleRejectRecommendation = async (recId) => {
    const reason = window.prompt('Enter reason for rejecting this transfer recommendation:', 'Transfer not needed at destination branch')
    if (reason === null) return
    setRejectingRecId(recId)
    setAiActionError(null)
    setAiActionMessage(null)
    try {
      await optimizationApi.reject(recId, reason || 'Rejected by reviewer')
      setAiActionMessage('Transfer recommendation rejected.')
      await fetchAll()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to reject transfer recommendation.'
      setAiActionError(msg)
    } finally {
      setRejectingRecId(null)
    }
  }

  const filtered = statusFilter === 'all'
    ? transfers
    : transfers.filter(t => t.status === statusFilter)

  const statusCounts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = transfers.filter(t => t.status === s).length
    return acc
  }, {})

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Stock Transfers</h1>
          <p>Manage inter-branch inventory transfer requests end-to-end</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={fetchAll} disabled={loading}>
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {canCreate && (
            <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <TransfersIcon style={{ width: 16, height: 16 }} />
              New Transfer
            </button>
          )}
        </div>
      </div>

      {/* AI Action feedback alerts */}
      {aiActionMessage && (
        <div style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-3) var(--space-4)', background: '#ecfdf5', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#065f46', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
            <CheckCircleIcon style={{ width: 18, height: 18, color: '#059669' }} />
            <span>{aiActionMessage}</span>
          </div>
          <button type="button" onClick={() => setAiActionMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#047857', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {aiActionError && (
        <div className="error-banner" role="alert" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="error-banner-content">
            <AlertCircleIcon />
            <span>{aiActionError}</span>
          </div>
          <button type="button" onClick={() => setAiActionError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* AI Transfer Recommendations if any exist */}
      {aiRecommendations.length > 0 && (
        <div className="table-card" style={{ marginBottom: 'var(--space-6)', borderLeft: '4px solid var(--color-primary)' }}>
          <div className="table-card-header" style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--color-border-subtle, #f1f5f9)' }}>
            <div className="table-card-title" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span style={{ fontSize: '1.1rem' }}>🤖</span>
              <span style={{ fontWeight: 600 }}>AI Transfer Recommendations</span>
              <Badge variant="info">{aiRecommendations.length} Pending Approval</Badge>
            </div>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Identified by Inventory Optimization Agent (Cross-branch surplus balance)
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
            {aiRecommendations.map((rec) => {
              const recId = rec.recommendationId || rec.id
              const prodName = rec.product?.name || 'Product'
              const prodSku = rec.product?.sku || ''
              const srcName = rec.sourceBranch?.name || 'Surplus Branch'
              const dstName = rec.destinationBranch?.name || 'Destination Branch'
              const qty = rec.suggestedQuantity ?? 0
              const isApproving = approvingRecId === recId
              const isRejecting = rejectingRecId === recId

              return (
                <div
                  key={recId}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--color-bg-subtle, #f8fafc)',
                    border: '1px solid var(--color-border-subtle, #e2e8f0)',
                    borderRadius: 'var(--radius-md, 8px)',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <strong>{prodName}</strong>
                      {prodSku && <span className="sku-pill">{prodSku}</span>}
                      <Badge variant="warning">{qty} Units Needed</Badge>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <span><strong>From:</strong> {srcName}</span>
                      <span>➔</span>
                      <span><strong>To:</strong> {dstName}</span>
                    </div>
                    {rec.reasoning && (
                      <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        💡 {rec.reasoning}
                      </p>
                    )}
                  </div>
                  {canReviewAi && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApproveRecommendation(recId)}
                        disabled={isApproving || isRejecting}
                      >
                        {isApproving ? 'Approving…' : 'Approve & Create Transfer'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRejectRecommendation(recId)}
                        disabled={isApproving || isRejecting}
                      >
                        {isRejecting ? 'Rejecting…' : 'Dismiss'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="filter-tabs" style={{ marginBottom: 'var(--space-4)' }}>
        <button
          type="button"
          className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
        >
          All
          <span className="filter-tab-count">{transfers.length}</span>
        </button>
        {ALL_STATUSES.map(s => (
          <button
            key={s}
            type="button"
            className={`filter-tab ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
            {statusCounts[s] > 0 && <span className="filter-tab-count">{statusCounts[s]}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={7} title="Loading transfers…" />
      ) : error ? (
        <div className="table-card"><ErrorState error={error} onRetry={fetchAll} /></div>
      ) : filtered.length === 0 ? (
        <div className="table-card">
          <EmptyState
            title={statusFilter === 'all' ? 'No Transfers Yet' : `No ${statusFilter} Transfers`}
            description={
              statusFilter === 'all'
                ? canCreate
                  ? 'No transfer requests have been created. Create a new transfer request to get started.'
                  : 'No transfer requests exist yet.'
                : `There are no transfers with status "${statusFilter}".`
            }
            actionLabel={canCreate && statusFilter === 'all' ? 'Create Transfer' : undefined}
            onAction={canCreate && statusFilter === 'all' ? () => setShowCreate(true) : undefined}
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>{statusFilter === 'all' ? 'All Transfers' : `${statusFilter} Transfers`}</span>
              <span className="count-badge">{filtered.length}</span>
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
                  <th>Requested by</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.stockTransferId}>
                    <td><span className="sku-pill">{t.transferNumber}</span></td>
                    <td>{t.sourceBranchName}</td>
                    <td>{t.destinationBranchName}</td>
                    <td style={{ textAlign: 'right' }}>{t.items?.length ?? 0}</td>
                    <td><Badge variant={STATUS_VARIANT[t.status] ?? 'default'}>{t.status}</Badge></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>{t.requestedByName}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>{fmt(t.requestedAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelected(t)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateTransferModal
          branches={branches}
          products={products}
          onClose={() => setShowCreate(false)}
          onCreated={fetchAll}
          prefill={initialPrefill}
          user={user}
        />
      )}

      {selectedTransfer && (
        <TransferDetailModal
          transfer={selectedTransfer}
          userRole={userRole}
          onClose={() => setSelected(null)}
          onAction={fetchAll}
        />
      )}
    </div>
  )
}
