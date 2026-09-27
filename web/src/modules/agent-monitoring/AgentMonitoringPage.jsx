import { useState, useEffect, useCallback } from 'react'
import apiClient from '../../api/axiosClient'

const STATUS_BADGE = {
  PendingApproval: 'badge-warning',
  Approved:        'badge-success',
  Rejected:        'badge-danger',
  ChecksFailed:    'badge-danger',
  InvalidInput:    'badge-danger',
  Failed:          'badge-danger',
  Completed:       'badge-success',
  Success:         'badge-success',
  Running:         'badge-info',
  Draft:           'badge-neutral',
  Converted:       'badge-info',
}

const AGENT_LABELS = {
  DemandForecastAgent:         'Demand Forecast',
  InventoryOptimizationAgent:  'Inventory Optimization',
  SupplierEvaluationAgent:     'Supplier Evaluation',
  ProcurementCoordinatorAgent: 'Procurement Coordinator',
  ReplenishmentOrchestrator:   'Replenishment Orchestrator',
}

function statusBadge(status) {
  const cls = STATUS_BADGE[status] ?? 'badge-neutral'
  return <span className={`badge ${cls}`}>{status ?? '—'}</span>
}

function agentLabel(name) {
  return AGENT_LABELS[name] ?? name ?? '—'
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function TracePanel({ run, onClose }) {
  if (!run) return null

  let steps = []
  let validations = []
  let finalOutcome = null

  try { steps = run.toolExecutions ?? JSON.parse(run.toolExecutionsJson ?? '[]') } catch { /* ignore */ }
  try { validations = run.validationResults ?? JSON.parse(run.validationResultsJson ?? '[]') } catch { /* ignore */ }
  try { finalOutcome = run.finalOutcomeJson ? JSON.parse(run.finalOutcomeJson) : null } catch { /* ignore */ }

  return (
    <div className="detail-card" style={{ marginTop: 'var(--space-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ margin: 0 }}>
          Trace — {agentLabel(run.agentName ?? run.agent ?? run._source)}
          <span style={{ marginLeft: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {run.workflowId ?? run.id}
          </span>
        </h3>
        <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
      </div>

      <dl className="detail-kv" style={{ marginBottom: 'var(--space-4)' }}>
        <dt>Status</dt>       <dd>{statusBadge(run.status ?? run.approvalStatus)}</dd>
        <dt>Started</dt>      <dd>{formatDate(run.startedAt ?? run.createdAtUtc)}</dd>
        <dt>Duration</dt>     <dd>{run.executionDurationMs != null ? `${run.executionDurationMs} ms` : '—'}</dd>
        <dt>Initiated by</dt> <dd>{run.initiatedBy ?? '—'}</dd>
        <dt>Objective</dt>    <dd style={{ wordBreak: 'break-word' }}>{run.objective ?? run.currentStep ?? '—'}</dd>
      </dl>

      {steps.length > 0 && (
        <>
          <p className="form-section-label">Tool Executions</p>
          <ol style={{ paddingLeft: 'var(--space-5)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {steps.map((s, i) => <li key={i}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>)}
          </ol>
        </>
      )}

      {validations.length > 0 && (
        <>
          <p className="form-section-label" style={{ marginTop: 'var(--space-4)' }}>Validation Results</p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {validations.map((v, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
                <span className={`badge ${v.passed ? 'badge-success' : 'badge-danger'}`}>{v.passed ? 'Pass' : 'Fail'}</span>
                <span>{v.rule ?? v.name ?? JSON.stringify(v)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {finalOutcome && (
        <>
          <p className="form-section-label" style={{ marginTop: 'var(--space-4)' }}>Final Outcome</p>
          <pre style={{ fontSize: 'var(--font-size-xs)', background: 'var(--slate-50)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', padding: 'var(--space-3)', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(finalOutcome, null, 2)}
          </pre>
        </>
      )}
    </div>
  )
}

export default function AgentMonitoringPage() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [agentFilter, setAgentFilter] = useState('All')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Every agent's runs from the shared AgentWorkflowAudits table (GET /api/agent-workflows/audits),
      // newest first, each with its agentName and a normalised status.
      const res = await apiClient.get('/api/agent-workflows/audits', { params: { take: 50 } })
      setRuns((res.data ?? []).map(r => ({ ...r, _source: r.agentName })))
    } catch (e) {
      setError(e.displayMessage ?? e.message ?? 'Failed to load agent workflows.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const agentNames = ['All', ...new Set(runs.map(r => r._source).filter(Boolean))]
  const filtered = agentFilter === 'All' ? runs : runs.filter(r => r._source === agentFilter)

  const counts = {
    total:   runs.length,
    success: runs.filter(r => ['Approved', 'Completed', 'Success'].includes(r.status ?? r.approvalStatus)).length,
    pending: runs.filter(r => ['PendingApproval', 'Running'].includes(r.status ?? r.approvalStatus)).length,
    failed:  runs.filter(r => ['Failed', 'ChecksFailed', 'Rejected', 'InvalidInput'].includes(r.status ?? r.approvalStatus)).length,
  }

  const toggleSelect = run => {
    const key = run.workflowId ?? run.id
    setSelected(s => (s?.workflowId ?? s?.id) === key ? null : run)
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Agent Monitoring</h1>
          <p>All four AI agent workflow runs — demand forecast, inventory optimization, supplier evaluation, procurement coordination.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            {loading ? <span className="spinner spinner-sm" /> : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card primary-accent">
          <div className="stat-card-top"><span className="stat-card-label">Total Runs</span></div>
          <div className="stat-card-value">{counts.total}</div>
        </div>
        <div className="stat-card success-accent">
          <div className="stat-card-top"><span className="stat-card-label">Succeeded</span></div>
          <div className="stat-card-value">{counts.success}</div>
        </div>
        <div className="stat-card warning-accent">
          <div className="stat-card-top"><span className="stat-card-label">Pending Approval</span></div>
          <div className="stat-card-value">{counts.pending}</div>
        </div>
        <div className="stat-card danger-accent">
          <div className="stat-card-top"><span className="stat-card-label">Failed / Rejected</span></div>
          <div className="stat-card-value">{counts.failed}</div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <div className="error-banner-content"><span>{error}</span></div>
          <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      <div className="toolbar-card">
        <div className="filter-tabs">
          {agentNames.map(a => (
            <button
              key={a}
              className={`filter-tab${agentFilter === a ? ' active' : ''}`}
              onClick={() => setAgentFilter(a)}
            >
              {agentLabel(a)}
              <span className="filter-tab-count">
                {a === 'All' ? runs.length : runs.filter(r => r._source === a).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">
            Workflow Runs <span className="count-badge">{filtered.length}</span>
          </span>
        </div>
        <div className="data-table-container">
          {loading ? (
            <div className="state-container"><span className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="state-container">
              <p className="state-title">No workflow runs found</p>
              <p className="state-desc">Agent runs will appear here once the API returns data.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Initiated By / Objective</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((run, i) => {
                  const key = run.workflowId ?? run.id ?? i
                  const isSelected = (selected?.workflowId ?? selected?.id) === (run.workflowId ?? run.id)
                  return (
                    <tr
                      key={key}
                      className={`clickable-row${isSelected ? ' row-warning' : ''}`}
                      onClick={() => toggleSelect(run)}
                    >
                      <td>
                        <span className="sku-pill">{(run.workflowId ?? run.id ?? '').slice(0, 8)}</span>
                      </td>
                      <td>{agentLabel(run._source)}</td>
                      <td>{statusBadge(run.status ?? run.approvalStatus)}</td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {formatDate(run.startedAt ?? run.createdAtUtc)}
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {run.executionDurationMs != null ? `${run.executionDurationMs} ms` : '—'}
                      </td>
                      <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {run.initiatedBy ?? run.objective ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <TracePanel run={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
