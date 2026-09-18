// PurchaseOrdersPage.jsx — purchase order list with status tracking and transitions
import React, { useState, useEffect, useCallback } from 'react'
import { ordersApi } from '../../api/procurementApi'
import { useProcurement } from '../../context/ProcurementContext'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { RefreshIcon, AlertCircleIcon, TransfersIcon } from '../../components/ui/Icons'
import {
  PurchaseOrderStatus,
  orderStatusMeta,
  allowedOrderTransitions,
  formatCurrency,
  formatDate,
  formatGuid,
} from '../../utils/procurementEnums'
import '../../styles/inventory.css'
import '../../styles/procurement.css'

function StatusModal({ order, targetStatus, onConfirm, onClose, saving, apiError }) {
  const [notes, setNotes] = useState('')
  const meta = orderStatusMeta[targetStatus]

  return (
    <Modal title={`Mark ${order.orderNumber} as ${meta.label}`} onClose={onClose} maxWidth="480px">
      <div className="modal-body">
        {apiError && (
          <div className="error-banner" role="alert">
            <div className="error-banner-content"><AlertCircleIcon /><span>{apiError}</span></div>
          </div>
        )}
        {targetStatus === PurchaseOrderStatus.Cancelled && (
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 0 }}>
            Cancelling releases this order's committed spend back to the branch budget.
          </p>
        )}
        <div className="form-group">
          <label>Notes <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea className="form-control" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={saving} />
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button
          type="button"
          className={`btn ${targetStatus === PurchaseOrderStatus.Cancelled ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => onConfirm(notes.trim() || null)}
          disabled={saving}
        >
          {saving ? 'Updating…' : `Confirm ${meta.label}`}
        </button>
      </div>
    </Modal>
  )
}

export default function PurchaseOrdersPage() {
  const { canDecideOrManage } = useProcurement()

  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('')

  const [action, setAction] = useState(null) // { order, targetStatus } | null
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await ordersApi.list({ status: status === '' ? undefined : status, pageSize: 50 })
      setItems(res.data?.items ?? [])
      setTotalCount(res.data?.totalCount ?? 0)
    } catch (err) {
      const s = err.response?.status
      if (s === 401 || s === 403) setError('You do not have access to purchase orders.')
      else setError(err.response?.data?.detail ?? 'Failed to load purchase orders.')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const handleUpdateStatus = async (notes) => {
    setSaving(true)
    setActionError(null)
    try {
      await ordersApi.updateStatus(action.order.id, { status: action.targetStatus, notes })
      setAction(null)
      await load()
    } catch (err) {
      const s = err.response?.status
      if (s === 401 || s === 403) setActionError('You do not have permission to update this order.')
      else if (s === 409) setActionError(err.response?.data?.detail ?? 'This transition is no longer valid for this order.')
      else setActionError(err.response?.data?.detail ?? 'Failed to update the order status.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Purchase Orders</h1>
          <p>Track orders converted from approved proposals through fulfillment</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      <div className="toolbar-card">
        <div className="toolbar-left">
          <select className="form-control" style={{ flex: '0 0 190px' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(PurchaseOrderStatus).map(([key, val]) => (
              <option key={key} value={val}>{orderStatusMeta[val].label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} columns={7} title="Loading purchase orders…" />
      ) : error ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={load} />
        </div>
      ) : items.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={TransfersIcon}
            title="No purchase orders yet"
            description="Orders appear here once an approved proposal is converted."
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Purchase Orders</span>
              <span className="count-badge">{totalCount} total</span>
            </div>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Supplier</th>
                  <th style={{ textAlign: 'right' }}>Total Cost</th>
                  <th>Status</th>
                  <th>Created</th>
                  {canDecideOrManage && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const meta = orderStatusMeta[o.status] ?? { label: 'Unknown', variant: 'neutral' }
                  const transitions = allowedOrderTransitions[o.status] ?? []
                  return (
                    <tr key={o.id}>
                      <td><strong>{o.orderNumber}</strong></td>
                      <td><span className="sku-pill" title={o.supplierId}>{formatGuid(o.supplierId)}</span></td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{formatCurrency(o.totalCost)}</strong>
                      </td>
                      <td><Badge variant={meta.variant}>{meta.label}</Badge></td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(o.createdAt)}</td>
                      {canDecideOrManage && (
                        <td style={{ textAlign: 'right' }}>
                          <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                            {transitions.includes(PurchaseOrderStatus.Received) && (
                              <button type="button" className="btn btn-primary btn-sm" onClick={() => setAction({ order: o, targetStatus: PurchaseOrderStatus.Received })}>
                                Mark Received
                              </button>
                            )}
                            {transitions.includes(PurchaseOrderStatus.PartiallyReceived) && (
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAction({ order: o, targetStatus: PurchaseOrderStatus.PartiallyReceived })}>
                                Partially Received
                              </button>
                            )}
                            {transitions.includes(PurchaseOrderStatus.Cancelled) && (
                              <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setAction({ order: o, targetStatus: PurchaseOrderStatus.Cancelled })}>
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {action && (
        <StatusModal
          order={action.order}
          targetStatus={action.targetStatus}
          onConfirm={handleUpdateStatus}
          onClose={() => { setAction(null); setActionError(null) }}
          saving={saving}
          apiError={actionError}
        />
      )}
    </div>
  )
}
