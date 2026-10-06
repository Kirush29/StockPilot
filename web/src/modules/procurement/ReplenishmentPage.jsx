// ReplenishmentPage.jsx — runs the multi-agent Replenishment Orchestrator and shows its trace
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import { replenishmentApi, agentWorkflowsApi } from '../../api/procurementApi'
import { branchesApi, productsApi, optimizationApi } from '../../api/inventoryApi'
import { useProcurement } from './ProcurementContext'
import Badge from '../../components/ui/Badge'
import ErrorState from '../../components/ui/ErrorState'
import { TableSkeleton } from '../../components/ui/Skeleton'
import { FormInput } from '../../components/ui/FormControls'
import { AlertCircleIcon, CheckCircleIcon } from '../../components/ui/Icons'
import { ProposalStatus, proposalStatusMeta, formatGuid, formatDateTime } from './procurementEnums'
import '../../shared/theme/inventory.css'
import './procurement.css'

export const replenishmentStatusMeta = {
  PendingApproval: { label: 'Proposal awaiting approval', variant: 'warning' },
  TransferRecommended: { label: 'Transfer recommended', variant: 'info' },
  NoActionRequired: { label: 'No action required', variant: 'success' },
  QuantityConflict: { label: 'Quantity needs a decision', variant: 'warning' },
  NoEligibleSupplier: { label: 'No eligible supplier', variant: 'danger' },
  ChecksFailed: { label: 'Procurement checks failed', variant: 'danger' },
  InvalidInput: { label: 'Invalid request', variant: 'danger' },
  Failed: { label: 'Failed', variant: 'danger' },
}

const stepVariant = { Completed: 'success', Failed: 'danger', Skipped: 'neutral', Running: 'info', Pending: 'neutral' }

const RULE_METADATA = {
  ObjectiveMatchesContract: {
    title: 'Workflow Input Schema',
    category: 'Input Contract',
  },
  ForecastMatchesContract: {
    title: 'Demand Forecast Contract',
    category: 'Agent Boundary',
  },
  SupplierMatchesContract: {
    title: 'Supplier Evaluation Contract',
    category: 'Procurement Policy',
  },
  ProcurementObjectiveMatchesContract: {
    title: 'Procurement Proposal Contract',
    category: 'Policy Guardrail',
  },
  UntrustedContentScreening: {
    title: 'Content & Injection Defense',
    category: 'AI Security',
  },
  PromptInjectionDefense: {
    title: 'Prompt Injection Defense',
    category: 'AI Security',
  },
  NonNegativeDemandConstraint: {
    title: 'Non-Negative Demand Constraint',
    category: 'Business Invariant',
  },
  InputSchema: {
    title: 'Input Schema Validation',
    category: 'Schema Contract',
  },
  LlmJustificationGrounding: {
    title: 'AI Rationale Grounding',
    category: 'Audit Guardrail',
  },
}

function formatRuleMeta(rule) {
  if (RULE_METADATA[rule]) return RULE_METADATA[rule]
  return {
    title: rule.replace(/([a-z])([A-Z])/g, '$1 $2'),
    category: 'Contract Rule',
  }
}

function RunForm({ onStarted }) {
  // ?branchId=&productId= prefill the form, e.g. from the Sales dashboard's "Dispatch to Procurement Agent".
  const [searchParams] = useSearchParams()
  const [branches, setBranches] = useState([])
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({
    branchId: searchParams.get('branchId') ?? '',
    productId: searchParams.get('productId') ?? '',
    forecastDays: '',
  })
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    branchesApi.getAll().then((r) => {
      const active = (r.data?.data ?? r.data ?? []).filter((b) => b.isActive !== false)
      setBranches(active)
      setForm((f) => {
        if (f.branchId && active.length > 0 && !active.some((b) => (b.branchId ?? b.id) === f.branchId)) {
          return { ...f, branchId: '' }
        }
        return f
      })
    }).catch(() => {})

    productsApi.getAll(false).then((r) => {
      const active = (r.data?.data ?? r.data ?? []).filter((p) => p.isActive !== false)
      setProducts(active)
      setForm((f) => {
        if (f.productId && active.length > 0 && !active.some((p) => (p.productId ?? p.id) === f.productId)) {
          return { ...f, productId: '' }
        }
        return f
      })
    }).catch(() => {})
  }, [])

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.branchId || !form.productId) {
      setError('Choose a branch and a product.')
      return
    }
    setRunning(true)
    setError(null)
    try {
      const res = await replenishmentApi.start({
        branchId: form.branchId,
        productId: form.productId,
        forecastDays: form.forecastDays ? Number(form.forecastDays) : undefined,
      })
      onStarted(res.data)
    } catch (err) {
      // 422/503 still return the run's result, so the trace can be shown.
      if (err.response?.data?.workflowId) onStarted(err.response.data)
      else if (err.response?.status === 403) setError('Your role cannot run the replenishment agents.')
      else {
        const d = err.response?.data
        const msg = d?.detail || d?.message || (Array.isArray(d?.errors) ? d.errors.join(' ') : null) || 'The replenishment run could not be started.'
        setError(msg)
      }
    } finally {
      setRunning(false)
    }
  }

  return (
    <form className="detail-card" onSubmit={submit} aria-label="Run replenishment check">
      <h3>Run a replenishment check</h3>
      {error && (
        <div className="error-banner" role="alert">
          <div className="error-banner-content"><AlertCircleIcon /><span>{error}</span></div>
        </div>
      )}
      <div className="form-group">
        <label htmlFor="replenishment-branch">Branch <span className="required">*</span></label>
        <select id="replenishment-branch" className="form-control" value={form.branchId} onChange={(e) => set('branchId', e.target.value)} disabled={running}>
          <option value="">Select a branch…</option>
          {branches.map((b) => {
            const bid = b.branchId ?? b.id
            return <option key={bid} value={bid}>{b.name}</option>
          })}
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="replenishment-product">Product <span className="required">*</span></label>
        <select id="replenishment-product" className="form-control" value={form.productId} onChange={(e) => set('productId', e.target.value)} disabled={running}>
          <option value="">Select a product…</option>
          {products.map((p) => {
            const pid = p.productId ?? p.id
            const sku = p.sku ?? p.SKU ?? ''
            return <option key={pid} value={pid}>{p.name}{sku ? ` (${sku})` : ''}</option>
          })}
        </select>
      </div>
      <FormInput
        label="Forecast horizon (days)"
        optionalText
        type="number"
        min={7}
        max={90}
        value={form.forecastDays}
        onChange={(e) => set('forecastDays', e.target.value)}
        disabled={running}
        placeholder="30"
      />
      <button type="submit" className="btn btn-primary" disabled={running}>
        {running ? 'Running agents…' : 'Run replenishment check'}
      </button>
    </form>
  )
}

function RunResult({ detail, onApproved }) {
  const { canDecideOrManage, canRaiseOrView } = useProcurement()
  const [approving, setApproving] = useState(false)
  const [approvingTransfer, setApprovingTransfer] = useState(false)
  const [rejectingTransfer, setRejectingTransfer] = useState(false)
  const [transferApproved, setTransferApproved] = useState(false)
  const [transferRejected, setTransferRejected] = useState(false)
  const [actionError, setActionError] = useState(null)
  const result = detail.result
  const meta = replenishmentStatusMeta[result?.status] ?? { label: result?.status ?? 'Unknown', variant: 'neutral' }
  // The workflow reports the proposal status by name; the shared metadata is keyed by the numeric enum.
  const proposalMeta = detail.liveProposalStatus ? proposalStatusMeta[ProposalStatus[detail.liveProposalStatus]] : null
  const procurementWorkflowId = result?.childWorkflows?.procurementWorkflowId
  const canApprove = canDecideOrManage && result?.status === 'PendingApproval' && detail.liveProposalStatus === 'PendingApproval'

  // Extract Recommendation ID from childWorkflows or nextAction URL
  const recIdMatch = result?.nextAction?.match(/\/api\/optimization\/recommendations\/([0-9a-fA-F-]+)\/approve/i)
  const recommendationId = result?.childWorkflows?.inventoryRecommendationId || (recIdMatch ? recIdMatch[1] : null)
  const isTransferRecommended = (result?.status === 'TransferRecommended' || result?.decision === 'Transfer' || !!recommendationId) && !!recommendationId
  const canApproveTransfer = (canDecideOrManage || canRaiseOrView) && isTransferRecommended && !transferApproved && !transferRejected

  const approve = async () => {
    setApproving(true)
    setActionError(null)
    try {
      await agentWorkflowsApi.approve(procurementWorkflowId, 'Approved from the replenishment run')
      await onApproved()
    } catch (err) {
      const s = err.response?.status
      if (s === 403) setActionError('You are not authorized to approve this proposal — it likely exceeds your role\'s approval limit.')
      else setActionError(err.response?.data?.detail ?? 'Failed to approve the proposal.')
    } finally {
      setApproving(false)
    }
  }

  const approveTransfer = async () => {
    if (!recommendationId) return
    setApprovingTransfer(true)
    setActionError(null)
    try {
      await optimizationApi.approve(recommendationId)
      setTransferApproved(true)
      await onApproved()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to approve transfer recommendation.'
      setActionError(msg)
    } finally {
      setApprovingTransfer(false)
    }
  }

  const rejectTransfer = async () => {
    if (!recommendationId) return
    const reason = window.prompt('Enter reason for rejecting this transfer recommendation:', 'Transfer not required at destination branch')
    if (reason === null) return
    setRejectingTransfer(true)
    setActionError(null)
    try {
      await optimizationApi.reject(recommendationId, reason || 'Rejected by reviewer')
      setTransferRejected(true)
      await onApproved()
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to reject transfer recommendation.'
      setActionError(msg)
    } finally {
      setRejectingTransfer(false)
    }
  }

  return (
    <div className="proposal-detail-grid">
      <div>
        <div className="detail-card" data-testid="replenishment-result">
          <h3>Outcome</h3>
          <p><Badge variant={meta.variant}>{meta.label}</Badge></p>
          {result?.nextAction && <p className="text-muted">{result.nextAction}</p>}
          {actionError && (
            <div className="error-banner" role="alert">
              <div className="error-banner-content"><AlertCircleIcon /><span>{actionError}</span></div>
            </div>
          )}
          <dl className="detail-kv">
            <dt>Decision</dt><dd>{result?.decision ?? '—'}</dd>
            <dt>Order quantity</dt><dd>{result?.orderQuantity ?? '—'}</dd>
            <dt>Forecast quantity</dt><dd>{result?.forecastReorderQuantity ?? '—'}</dd>
            <dt>Inventory shortage</dt><dd>{result?.inventoryShortageQuantity ?? '—'}</dd>
            <dt>Selected quotation</dt><dd>{result?.selectedQuotationId ? formatGuid(result.selectedQuotationId, 12) : '—'}</dd>
            <dt>Proposal</dt>
            <dd>
              {result?.proposalId
                ? <Link to={`/procurement/proposals/${result.proposalId}`}>{formatGuid(result.proposalId, 12)}</Link>
                : '—'}
              {proposalMeta && <> <Badge variant={proposalMeta.variant}>{proposalMeta.label}</Badge></>}
            </dd>
          </dl>
          {canApprove && (
            <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
              <button type="button" className="btn btn-primary" onClick={approve} disabled={approving}>
                {approving ? 'Approving…' : 'Approve proposal'}
              </button>
              <Link className="btn btn-secondary" to={`/procurement/proposals/${result.proposalId}`}>Review / reject</Link>
            </div>
          )}
          {canApproveTransfer && (
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-bg-subtle, #f8fafc)', borderRadius: 'var(--radius-md, 8px)', border: '1px solid var(--color-border-subtle, #e2e8f0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                <Badge variant="info">Action Required</Badge>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                  AI Inter-Branch Transfer
                </span>
              </div>
              <p style={{ fontSize: 'var(--font-size-sm)', margin: '0 0 var(--space-3) 0', color: 'var(--color-text-secondary)' }}>
                The AI optimization agent confirmed surplus inventory at another branch. Approve this recommendation to create an official stock transfer order in Inventory.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={approveTransfer}
                  disabled={approvingTransfer || rejectingTransfer}
                >
                  {approvingTransfer ? 'Approving & Creating Transfer…' : 'Approve transfer recommendation'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={rejectTransfer}
                  disabled={approvingTransfer || rejectingTransfer}
                >
                  {rejectingTransfer ? 'Rejecting…' : 'Reject recommendation'}
                </button>
                <Link className="btn btn-secondary" to="/inventory/transfers">
                  View transfers
                </Link>
              </div>
            </div>
          )}
          {transferApproved && (
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: '#ecfdf5', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #a7f3d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#065f46', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                <CheckCircleIcon style={{ width: 18, height: 18, color: '#059669' }} />
                <span>Inter-branch transfer created successfully!</span>
              </div>
              <p style={{ margin: 'var(--space-1) 0 var(--space-3) 0', fontSize: 'var(--font-size-xs)', color: '#047857' }}>
                The AI transfer recommendation has been officially converted to a stock transfer request in the Inventory module.
              </p>
              <Link className="btn btn-primary" to="/inventory/transfers">
                Open in Stock Transfers →
              </Link>
            </div>
          )}
          {transferRejected && (
            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: '#fef2f2', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #fecaca' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: '#991b1b', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                <AlertCircleIcon style={{ width: 18, height: 18, color: '#dc2626' }} />
                <span>Transfer recommendation rejected.</span>
              </div>
            </div>
          )}
          {result?.errors?.length > 0 && (
            <ul className="text-muted" aria-label="Errors">
              {result.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </div>

        <div className="detail-card">
          <h3>Agent steps</h3>
          <ol aria-label="Agent steps" style={{ paddingLeft: 'var(--space-5)' }}>
            {detail.steps.map((s) => (
              <li key={s.stepIndex} style={{ marginBottom: 'var(--space-3)' }}>
                <Badge variant={stepVariant[s.status] ?? 'neutral'}>{s.status}</Badge>{' '}
                <strong>{s.action}</strong>
                {s.detail && <div className="text-muted">{s.detail}</div>}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div>
        <div className="detail-card">
          <h3>Run</h3>
          <dl className="detail-kv">
            <dt>Workflow</dt><dd>{formatGuid(detail.workflowId, 12)}</dd>
            <dt>Started</dt><dd>{formatDateTime(detail.startedAtUtc)}</dd>
            <dt>Duration</dt><dd>{detail.executionDurationMs} ms</dd>
            <dt>Approval</dt><dd>{detail.approvalStatus}</dd>
          </dl>
        </div>

        <div className="detail-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
            <h3 style={{ margin: 0 }}>Contract checks</h3>
            {detail.validationResults?.length > 0 && (
              <Badge variant={detail.validationResults.every((v) => v.passed) ? 'success' : 'danger'}>
                {detail.validationResults.filter((v) => v.passed).length}/{detail.validationResults.length} Passed
              </Badge>
            )}
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 0, marginBottom: 'var(--space-3)' }}>
            Deterministic schema guardrails and multi-agent contract verification.
          </p>
          <ul aria-label="Contract checks" className="contract-checks-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {detail.validationResults?.map((v) => {
              const ruleMeta = formatRuleMeta(v.rule)
              return (
                <li key={v.rule} className={`contract-check-item ${v.passed ? 'passed' : 'failed'}`}>
                  <div className="contract-check-status-icon">
                    {v.passed ? (
                      <CheckCircleIcon width={15} height={15} style={{ color: 'var(--color-success, #10b981)' }} />
                    ) : (
                      <AlertCircleIcon width={15} height={15} style={{ color: 'var(--color-danger, #ef4444)' }} />
                    )}
                  </div>
                  <div className="contract-check-content">
                    <div className="contract-check-top">
                      <span className="contract-check-title">{ruleMeta.title}</span>
                      <span className="contract-check-badge-wrap">
                        <Badge variant={v.passed ? 'success' : 'danger'}>
                          {v.passed ? 'Passed' : 'Failed'}
                        </Badge>
                      </span>
                    </div>
                    <div className="contract-check-rule-row">
                      <code className="contract-check-code">{v.rule}</code>
                      <span className="contract-check-category">{ruleMeta.category}</span>
                    </div>
                    {v.details && (
                      <div className="contract-check-details">{v.details}</div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function ReplenishmentPage() {
  const { workflowId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(Boolean(workflowId))
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!workflowId) {
      setDetail(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await replenishmentApi.get(workflowId)
      setDetail(res.data)
    } catch (err) {
      const s = err.response?.status
      if (s === 404) setError('This replenishment run no longer exists.')
      else if (s === 401 || s === 403) setError('You do not have access to replenishment runs.')
      else setError(err.response?.data?.detail ?? 'Failed to load the replenishment run.')
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Replenishment Agent</h1>
          <p>Inventory Optimization → Demand Forecast → Supplier Evaluation → Procurement Coordinator. Nothing is approved without you.</p>
        </div>
        {workflowId && (
          <div className="page-header-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/procurement/replenishment')}>New check</button>
          </div>
        )}
      </div>

      {!workflowId && <RunForm onStarted={(result) => navigate(`/procurement/replenishment/${result.workflowId}`)} />}
      {workflowId && loading && <TableSkeleton rows={4} columns={2} title="Loading run…" />}
      {workflowId && error && <ErrorState error={error} onRetry={load} />}
      {workflowId && !loading && !error && detail && <RunResult detail={detail} onApproved={load} />}
    </div>
  )
}
