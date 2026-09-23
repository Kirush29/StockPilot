// TransfersPage.jsx — Full inter-branch stock transfer management
import React, { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { transfersApi, branchesApi, productsApi, inventoryApi } from '../../api/inventoryApi'
import { useAuth } from '../../context/AuthContext'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import { RefreshIcon, TransfersIcon, CloseIcon } from '../../components/ui/Icons'
import '../../styles/inventory.css'

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

function CreateTransferModal({ branches, products, onClose, onCreated, prefill }) {
  const [sourceBranchId, setSourceBranchId]           = useState(prefill?.sourceBranchId || '')
  const [destinationBranchId, setDestinationBranchId] = useState(prefill?.destinationBranchId || '')
  const [notes, setNotes]                             = useState(prefill?.reason || '')
  const [items, setItems]                             = useState(
    prefill?.productId 
      ? [{ productId: prefill.productId, requestedQuantity: prefill.quantity || '' }] 
      : [{ productId: '', requestedQuantity: '' }]
  )
  const [availableStock, setAvailableStock]           = useState({})
  const [submitting, setSubmitting]                   = useState(false)
  const [error, setError]                             = useState(null)

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
    for (const [i, item] of items.entries()) {
      if (!item.productId) { setError(`Row ${i + 1}: Please select a product.`); return }
      if (!item.requestedQuantity || Number(item.requestedQuantity) <= 0) {
        setError(`Row ${i + 1}: Quantity must be greater than 0.`); return
      }
      const stock = availableStock[`${i}`]
      if (stock && Number(item.requestedQuantity) > Number(stock.availableQuantity)) {
        setError(`Row ${i + 1}: Requested quantity exceeds available stock (${stock.availableQuantity} ${stock.unit ?? ''}).`)
        return
      }
    }

    setSubmitting(true)
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
      setError(err.response?.data?.message ?? err.message ?? 'Failed to create transfer.')
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

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="ct-source">Source Branch <span className="required">*</span></label>
                <select id="ct-source" className="form-control" value={sourceBranchId} onChange={e => handleSourceChange(e.target.value)} required>
                  <option value="">— Select source branch —</option>
                  {branches.map(b => (
                    <option key={b.branchId} value={b.branchId}>{b.name} ({b.branchCode})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ct-dest">Destination Branch <span className="required">*</span></label>
                <select id="ct-dest" className="form-control" value={destinationBranchId} onChange={e => setDestinationBranchId(e.target.value)} required>
                  <option value="">— Select destination branch —</option>
                  {branches.filter(b => b.branchId !== sourceBranchId).map(b => (
                    <option key={b.branchId} value={b.branchId}>{b.name} ({b.branchCode})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ct-notes">Notes (Optional)</label>
              <textarea id="ct-notes" className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes about this transfer request…" />
            </div>

            <div className="form-section-label">Transfer Items</div>

            {items.map((item, idx) => {
              const stock = availableStock[`${idx}`]
              return (
                <div key={idx} className="transfer-item-row">
                  <div className="transfer-item-fields">
                    <div className="form-group" style={{ flex: 2 }}>
                      <label className="form-label">Product</label>
                      <select
                        className="form-control"
                        value={item.productId}
                        onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                        required
                      >
                        <option value="">— Select product —</option>
                        {products.map(p => (
                          <option key={p.productId} value={p.productId}>{p.name} ({p.sku})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">
                        Quantity
                        {stock && (
                          <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.6875rem', marginLeft: 6 }}>
                            Available: {Number(stock.availableQuantity).toLocaleString()}
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        min="0.01"
                        step="0.01"
                        value={item.requestedQuantity}
                        onChange={e => handleItemChange(idx, 'requestedQuantity', e.target.value)}
                        required
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
      setError(err.response?.data?.message ?? err.message ?? 'Action failed.')
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
            <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
              <label className="form-label">Rejection Reason <span className="required">*</span></label>
              <textarea className="form-control" rows={2} value={rejectionReason} onChange={e => setRej(e.target.value)} placeholder="Explain why this transfer is being rejected…" />
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
  const { user }  = useAuth()
  const userRole  = user?.role ?? ''

  const location = useLocation()
  const canCreate = userRole === 'BranchManager' || userRole === 'BusinessOwner' || userRole === 'ProcurementManager' // Actually let any privileged user create transfers if they want to in this prototype.

  const [transfers, setTransfers]         = useState([])
  const [branches, setBranches]           = useState([])
  const [products, setProducts]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [statusFilter, setStatusFilter]   = useState('all')
  
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
      const [trRes, brRes, prRes] = await Promise.all([
        transfersApi.getAll(),
        branchesApi.getAll().catch(() => ({ data: [] })),
        productsApi.getAll().catch(() => ({ data: [] })),
      ])
      setTransfers(trRes.data?.data ?? trRes.data ?? [])
      setBranches(brRes.data?.data ?? brRes.data ?? [])
      setProducts(prRes.data?.data ?? prRes.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load transfers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

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
