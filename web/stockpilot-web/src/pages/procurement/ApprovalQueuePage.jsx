// ApprovalQueuePage.jsx — proposals awaiting a decision, filtered to what this role can act on
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { proposalsApi } from '../../api/procurementApi'
import { useProcurement } from '../../context/ProcurementContext'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { RefreshIcon, CheckCircleIcon } from '../../components/ui/Icons'
import { ProposalStatus, formatCurrency, formatDate, formatGuid, isWithinApprovalLimit } from '../../utils/procurementEnums'
import '../../styles/inventory.css'
import '../../styles/procurement.css'

export default function ApprovalQueuePage() {
  const { role } = useProcurement()
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await proposalsApi.list({ status: ProposalStatus.PendingApproval, sort: '-totalEstimatedCost', pageSize: 100 })
      setItems(res.data?.items ?? [])
    } catch (err) {
      const s = err.response?.status
      if (s === 401 || s === 403) setError('You do not have access to the approval queue.')
      else setError(err.response?.data?.detail ?? 'Failed to load the approval queue.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const withinLimit = items.filter((p) => isWithinApprovalLimit(role, p.totalEstimatedCost))
  const beyondLimit = items.length - withinLimit.length

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Approval Queue</h1>
          <p>Proposals awaiting your decision, within your role's approval limit</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {beyondLimit > 0 && (
        <div className="error-banner" style={{ background: 'var(--color-info-bg)', borderColor: 'var(--color-info-border)', color: 'var(--color-info-text)' }} role="status">
          <div className="error-banner-content">
            <span>{beyondLimit} additional {beyondLimit === 1 ? 'proposal exceeds' : 'proposals exceed'} your approval limit and {beyondLimit === 1 ? 'is' : 'are'} hidden from this queue.</span>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} columns={5} title="Loading approval queue…" />
      ) : error ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={load} />
        </div>
      ) : withinLimit.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={CheckCircleIcon}
            title="Nothing awaiting your approval"
            description="You're all caught up — new proposals submitted for review will show up here."
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Pending Your Decision</span>
              <span className="count-badge">{withinLimit.length}</span>
            </div>
          </div>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Supplier</th>
                  <th style={{ textAlign: 'right' }}>Estimated Cost</th>
                  <th>Source</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {withinLimit.map((p) => (
                  <tr key={p.id}>
                    <td><span className="sku-pill" title={p.branchId}>{formatGuid(p.branchId)}</span></td>
                    <td><span className="sku-pill" title={p.supplierId}>{formatGuid(p.supplierId)}</span></td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <strong>{formatCurrency(p.totalEstimatedCost)}</strong>
                    </td>
                    <td>
                      {p.createdByAgent ? <Badge variant="info">Agent</Badge> : <Badge variant="neutral">Manual</Badge>}
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{formatDate(p.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/procurement/proposals/${p.id}`)}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
