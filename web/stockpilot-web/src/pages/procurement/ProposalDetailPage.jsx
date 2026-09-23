// ProposalDetailPage.jsx — line items, budget context, decisions and lifecycle actions
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { proposalsApi, budgetsApi } from '../../api/procurementApi'
import { useProcurement } from '../../context/ProcurementContext'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import ErrorState from '../../components/ui/ErrorState'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { FormInput } from '../../components/ui/FormControls'
import { AlertCircleIcon, EditIcon } from '../../components/ui/Icons'
import DecisionTimeline from '../../components/procurement/DecisionTimeline'
import BudgetBar from '../../components/procurement/BudgetBar'
import {
  ProposalStatus,
  proposalStatusMeta,
  ApprovalDecisionType,
  formatCurrency,
  formatDateTime,
  formatGuid,
} from '../../utils/procurementEnums'
import '../../styles/inventory.css'
import '../../styles/procurement.css'

function findActiveBudget(budgets) {
  const today = new Date().toISOString().slice(0, 10)
  return budgets.find((b) => b.periodStart <= today && today <= b.periodEnd) ?? budgets[0] ?? null
}

function DecisionModal({ decision, onConfirm, onClose, saving, apiError }) {
  const [comment, setComment] = useState('')
  const copy = {
    [ApprovalDecisionType.Approved]: { title: 'Approve Proposal', action: 'Approve', className: 'btn-primary' },
    [ApprovalDecisionType.Rejected]: { title: 'Reject Proposal', action: 'Reject', className: 'btn-danger' },
    [ApprovalDecisionType.RevisionRequested]: { title: 'Request Revision', action: 'Request Revision', className: 'btn-secondary' },
  }[decision]

  return (
    <Modal title={copy.title} onClose={onClose} maxWidth="480px">
      <div className="modal-body">
        {apiError && (
          <div className="error-banner" role="alert">
            <div className="error-banner-content"><AlertCircleIcon /><span>{apiError}</span></div>
          </div>
        )}
        <div style={{ marginTop: 'var(--space-4)' }}>
          <FormInput
            label={<span>Comment <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85em', marginLeft: '4px' }}>(Optional)</span></span>}
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={saving}
            placeholder="Add context for this decision…"
          />
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="button" className={`btn ${copy.className}`} onClick={() => onConfirm(comment.trim() || null)} disabled={saving}>
          {saving ? 'Submitting…' : copy.action}
        </button>
      </div>
    </Modal>
  )
}

export default function ProposalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canRaiseOrView, canDecideOrManage } = useProcurement()

  const [proposal, setProposal] = useState(null)
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [decisionModal, setDecisionModal] = useState(null) // ApprovalDecisionType | null
  const [actionError, setActionError] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await proposalsApi.getById(id)
      setProposal(res.data)
      try {
        const budgetsRes = await budgetsApi.list(res.data.branchId)
        setBudget(findActiveBudget(budgetsRes.data ?? []))
      } catch {
        setBudget(null) // Budget context is a nice-to-have; don't fail the whole page over it.
      }
    } catch (err) {
      const s = err.response?.status
      if (s === 404) setError('This proposal no longer exists.')
      else if (s === 401 || s === 403) setError('You do not have access to this proposal.')
      else setError(err.response?.data?.detail ?? 'Failed to load the proposal.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const handleDecision = async (comment) => {
    setSaving(true)
    setActionError(null)
    try {
      await proposalsApi.decide(id, { decision: decisionModal, comment })
      setDecisionModal(null)
      await load()
    } catch (err) {
      const s = err.response?.status
      if (s === 403) {
        setActionError('You are not authorized to approve this proposal — it likely exceeds your role\'s approval limit.')
      } else if (s === 409) {
        setActionError(err.response?.data?.detail ?? 'This proposal is no longer awaiting a decision.')
      } else {
        setActionError(err.response?.data?.detail ?? 'Failed to record the decision.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleConvert = async () => {
    setSaving(true)
    setActionError(null)
    try {
      await proposalsApi.convert(id)
      navigate('/procurement/orders')
    } catch (err) {
      const s = err.response?.status
      if (s === 403) setActionError('You are not authorized to convert this proposal.')
      else setActionError(err.response?.data?.detail ?? 'Failed to convert this proposal to a purchase order.')
      setSaving(false)
    }
  }

  if (loading) return <TableSkeleton rows={4} columns={4} title="Loading proposal…" />
  if (error) return <ErrorState error={error} onRetry={load} />
  if (!proposal) return null

  const meta = proposalStatusMeta[proposal.status] ?? { label: 'Unknown', variant: 'neutral' }
  const isEditable = proposal.status === ProposalStatus.Draft || proposal.status === ProposalStatus.RevisionRequested
  const isPendingApproval = proposal.status === ProposalStatus.PendingApproval
  const isApproved = proposal.status === ProposalStatus.Approved
  const overBudget = budget ? proposal.totalEstimatedCost > (budget.allocatedAmount - budget.spentAmount) : false

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Proposal <span className="sku-pill">{formatGuid(proposal.id, 12)}</span></h1>
          <p>Branch {formatGuid(proposal.branchId)} · Supplier {formatGuid(proposal.supplierId)}</p>
        </div>
        <div className="page-header-actions">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {canRaiseOrView && isEditable && (
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/procurement/proposals/${id}/edit`)}>
              <EditIcon />
              Edit
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="error-banner" role="alert">
          <div className="error-banner-content"><AlertCircleIcon /><span>{actionError}</span></div>
        </div>
      )}

      <div className="proposal-detail-grid">
        <div>
          <div className="detail-card">
            <h3>Line Items</h3>
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                    <th style={{ textAlign: 'right' }}>Unit Price</th>
                    <th style={{ textAlign: 'right' }}>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.lineItems.map((li) => (
                    <tr key={li.id}>
                      <td>{li.productName}</td>
                      <td style={{ textAlign: 'right' }}>{li.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(li.unitPrice)}</td>
                      <td style={{ textAlign: 'right' }}><strong>{formatCurrency(li.lineTotal)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="line-item-footer">
              <span />
              <div className="line-item-grand-total">
                Total Estimated Cost: <strong>{formatCurrency(proposal.totalEstimatedCost)}</strong>
              </div>
            </div>

            {proposal.justification && (
              <>
                <h3 style={{ marginTop: 'var(--space-5)' }}>Justification</h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {proposal.justification}
                </p>
              </>
            )}
          </div>

          <div className="detail-card">
            <h3>Decision History</h3>
            <DecisionTimeline decisions={proposal.approvalDecisions} />
          </div>
        </div>

        <div>
          {budget && (
            <div className="detail-card">
              <h3>Branch Budget</h3>
              <BudgetBar allocated={budget.allocatedAmount} spent={budget.spentAmount} label={`Period ${budget.periodStart} – ${budget.periodEnd}`} />
              {overBudget && isPendingApproval && (
                <p className="form-hint" style={{ marginTop: 'var(--space-3)' }}>
                  This proposal's cost exceeds the branch's remaining budget.
                </p>
              )}
            </div>
          )}

          <div className="detail-card">
            <h3>Details</h3>
            <dl className="detail-kv">
              <dt>Status</dt>
              <dd><Badge variant={meta.variant}>{meta.label}</Badge></dd>
              <dt>Source</dt>
              <dd>{proposal.createdByAgent ? 'Procurement Coordinator Agent' : 'Manual'}</dd>
              <dt>Created</dt>
              <dd>{formatDateTime(proposal.createdAt)}</dd>
              <dt>Last Updated</dt>
              <dd>{formatDateTime(proposal.updatedAt)}</dd>
            </dl>

            {canDecideOrManage && isPendingApproval && (
              <div className="decision-actions">
                <button type="button" className="btn btn-primary" onClick={() => setDecisionModal(ApprovalDecisionType.Approved)}>
                  Approve
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setDecisionModal(ApprovalDecisionType.Rejected)}>
                  Reject
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setDecisionModal(ApprovalDecisionType.RevisionRequested)}>
                  Request Revision
                </button>
              </div>
            )}

            {canDecideOrManage && isApproved && (
              <div className="decision-actions">
                <button type="button" className="btn btn-primary" onClick={handleConvert} disabled={saving}>
                  {saving ? 'Converting…' : 'Convert to Purchase Order'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {decisionModal !== null && (
        <DecisionModal
          decision={decisionModal}
          onConfirm={handleDecision}
          onClose={() => { setDecisionModal(null); setActionError(null) }}
          saving={saving}
          apiError={actionError}
        />
      )}
    </div>
  )
}
