// BudgetDashboardPage.jsx — allocated vs spent vs remaining per branch, with a simple bar chart
import React, { useState, useEffect, useCallback } from 'react'
import { budgetsApi } from '../../api/procurementApi'
import { branchesApi } from '../../api/inventoryApi'
import StatCard from '../../components/ui/StatCard'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import ErrorState from '../../components/ui/ErrorState'
import { CardSkeleton } from '../../components/ui/Skeleton'
import { RefreshIcon, PlusIcon, AlertCircleIcon, StockIcon } from '../../components/ui/Icons'
import BudgetBar from '../../components/procurement/BudgetBar'
import { formatCurrency, formatGuid } from '../../utils/procurementEnums'
import '../../styles/inventory.css'
import '../../styles/procurement.css'

const EMPTY_FORM = { branchId: '', periodStart: '', periodEnd: '', allocatedAmount: '' }

function NewBudgetModal({ onSave, onClose, saving, apiError, branches }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    const guidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!guidRe.test(form.branchId.trim())) e.branchId = 'Must be a valid branch ID (GUID).'
    if (!form.periodStart) e.periodStart = 'Required.'
    if (!form.periodEnd) e.periodEnd = 'Required.'
    if (form.periodStart && form.periodEnd && form.periodEnd < form.periodStart) e.periodEnd = 'Must be after the start date.'
    const amount = parseFloat(form.allocatedAmount)
    if (form.allocatedAmount === '' || isNaN(amount) || amount <= 0) e.allocatedAmount = 'Must be greater than 0.'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSave({
      branchId: form.branchId.trim(),
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      allocatedAmount: parseFloat(form.allocatedAmount),
    })
  }

  return (
    <Modal title="New Branch Budget" subtitle="Allocate a budget for a branch and period" onClose={onClose} maxWidth="480px">
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          {apiError && (
            <div className="error-banner" role="alert">
              <div className="error-banner-content"><AlertCircleIcon /><span>{apiError}</span></div>
            </div>
          )}
          <div className="form-group">
            <label>Branch <span className="required">*</span></label>
            <select
              className={`form-control ${errors.branchId ? 'error' : ''}`}
              value={form.branchId}
              onChange={(e) => set('branchId', e.target.value)}
              disabled={saving}
            >
              <option value="">Select a branch…</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
            {errors.branchId && <span className="form-error">{errors.branchId}</span>}
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Period Start <span className="required">*</span></label>
              <input type="date" className={`form-control ${errors.periodStart ? 'error' : ''}`} value={form.periodStart} onChange={(e) => set('periodStart', e.target.value)} disabled={saving} />
              {errors.periodStart && <span className="form-error">{errors.periodStart}</span>}
            </div>
            <div className="form-group">
              <label>Period End <span className="required">*</span></label>
              <input type="date" className={`form-control ${errors.periodEnd ? 'error' : ''}`} value={form.periodEnd} onChange={(e) => set('periodEnd', e.target.value)} disabled={saving} />
              {errors.periodEnd && <span className="form-error">{errors.periodEnd}</span>}
            </div>
          </div>
          <div className="form-group">
            <label>Allocated Amount (Rs.) <span className="required">*</span></label>
            <input type="number" min="0" step="0.01" className={`form-control ${errors.allocatedAmount ? 'error' : ''}`} value={form.allocatedAmount} onChange={(e) => set('allocatedAmount', e.target.value)} disabled={saving} />
            {errors.allocatedAmount && <span className="form-error">{errors.allocatedAmount}</span>}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Budget'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function BudgetDashboardPage() {
  const [budgets, setBudgets] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [bRes, brRes] = await Promise.all([
        budgetsApi.list(),
        branchesApi.getAll().catch(() => ({ data: [] }))
      ])
      setBudgets(bRes.data ?? [])
      setBranches(brRes.data?.data ?? brRes.data ?? [])
    } catch (err) {
      const s = err.response?.status
      if (s === 401 || s === 403) setError('You do not have access to the budget dashboard.')
      else setError(err.response?.data?.detail ?? 'Failed to load budgets.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (payload) => {
    setSaving(true)
    setModalError(null)
    try {
      await budgetsApi.create(payload)
      setShowNew(false)
      await load()
    } catch (err) {
      const s = err.response?.status
      if (s === 409) setModalError(err.response?.data?.detail ?? 'A budget for this branch already covers part of this period.')
      else setModalError(err.response?.data?.detail ?? 'Failed to create the budget.')
    } finally {
      setSaving(false)
    }
  }

  const totalAllocated = budgets.reduce((sum, b) => sum + Number(b.allocatedAmount), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spentAmount), 0)
  const totalRemaining = totalAllocated - totalSpent

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>Budget Dashboard</h1>
          <p>Allocated, spent and remaining budget per branch and period</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowNew(true)}>
            <PlusIcon />
            New Budget
          </button>
        </div>
      </div>

      {loading ? (
        <div className="stat-grid">
          <CardSkeleton /><CardSkeleton /><CardSkeleton />
        </div>
      ) : !error && budgets.length > 0 ? (
        <div className="stat-grid">
          <StatCard label="Total Allocated" value={formatCurrency(totalAllocated)} icon={StockIcon} variant="primary" />
          <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={StockIcon} variant="warning" />
          <StatCard label="Total Remaining" value={formatCurrency(totalRemaining)} icon={StockIcon} variant={totalRemaining >= 0 ? 'success' : 'danger'} />
        </div>
      ) : null}

      {error ? (
        <div className="table-card"><ErrorState error={error} onRetry={load} /></div>
      ) : !loading && budgets.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={StockIcon}
            title="No budgets allocated yet"
            description="Create a branch budget so proposals can be checked against remaining spend."
            actionLabel="New Budget"
            actionIcon={PlusIcon}
            onAction={() => setShowNew(true)}
          />
        </div>
      ) : !loading ? (
        <div className="budget-dashboard-grid">
          {budgets.map((b) => {
            const branch = branches.find(br => br.id === b.branchId)
            return (
              <div className="budget-dashboard-card" key={b.id}>
                <div className="budget-dashboard-card-head">
                  <h3>Branch: <span className="sku-pill" title={b.branchId}>{branch ? branch.name : formatGuid(b.branchId)}</span></h3>
                  <span>{b.periodStart} – {b.periodEnd}</span>
                </div>
                <BudgetBar allocated={b.allocatedAmount} spent={b.spentAmount} />
              </div>
            )
          })}
        </div>
      ) : null}

      {showNew && (
        <NewBudgetModal
          onSave={handleCreate}
          onClose={() => { setShowNew(false); setModalError(null) }}
          saving={saving}
          apiError={modalError}
          branches={branches}
        />
      )}
    </div>
  )
}
