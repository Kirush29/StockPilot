// BranchesPage.jsx — Polished SaaS Branch Management
import React, { useState, useEffect, useCallback } from 'react'
import { branchesApi } from '../../../api/inventoryApi'
import Modal from '../../../components/ui/Modal'
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
  DashboardIcon as BranchesIcon,
} from '../../../components/ui/Icons'
import '../../../styles/inventory.css'

const EMPTY_BRANCH_FORM = {
  name: '',
  code: '',
  location: '',
  city: '',
  phoneNumber: '',
  email: '',
  managerName: '',
  isActive: true,
}

// ── Add / Edit Branch Modal ──────────────────────────────────────────────────
function BranchModal({ initial, onSave, onClose, saving, apiError }) {
  const isEdit = !!initial
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name ?? '',
          code: initial.code ?? '',
          location: initial.location ?? '',
          city: initial.city ?? '',
          phoneNumber: initial.phoneNumber ?? '',
          email: initial.email ?? '',
          managerName: initial.managerName ?? '',
          isActive: initial.isActive ?? true,
        }
      : EMPTY_BRANCH_FORM
  )
  const [errors, setErrors] = useState({})

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Branch name is required.'
    if (!isEdit && !form.code.trim()) e.code = 'Branch code is required.'
    return e
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    onSave({
      name: form.name.trim(),
      code: isEdit ? initial.code : form.code.trim(),
      address: form.location?.trim() || null,
      city: form.city?.trim() || null,
      phoneNumber: form.phoneNumber?.trim() || null,
      email: form.email?.trim() || null,
      managerName: form.managerName?.trim() || null,
      isActive: form.isActive,
    })
  }

  return (
    <Modal
      title={isEdit ? 'Edit Branch' : 'Add Branch'}
      subtitle={isEdit ? `Update properties for ${initial.name}` : 'Create a new branch location'}
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

          <div className="form-row">
            {/* Branch Name */}
            <div className="form-group">
              <label>Branch Name <span className="required">*</span></label>
              <input
                type="text"
                className={`form-control ${errors.name ? 'error' : ''}`}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Colombo Main Branch"
                maxLength={200}
                disabled={saving}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            {/* Branch Code */}
            <div className="form-group">
              <label>Branch Code <span className="required">*</span></label>
              <input
                type="text"
                className={`form-control ${errors.code ? 'error' : ''}`}
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                placeholder="e.g. CMB-001"
                maxLength={50}
                disabled={saving || isEdit}
              />
              {errors.code && <span className="form-error">{errors.code}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Address / Location</label>
            <input
              type="text"
              className="form-control"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Full address"
              maxLength={500}
              disabled={saving}
            />
          </div>

          <div className="form-row">
            {/* City */}
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                className="form-control"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="e.g. Colombo"
                maxLength={100}
                disabled={saving}
              />
            </div>
            {/* Phone Number */}
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={form.phoneNumber}
                onChange={e => set('phoneNumber', e.target.value)}
                placeholder="e.g. +94 11 234 5678"
                maxLength={50}
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-row">
            {/* Email */}
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="branch@stockpilot.com"
                maxLength={200}
                disabled={saving}
              />
            </div>
            {/* Manager Name */}
            <div className="form-group">
              <label>Manager Name</label>
              <input
                type="text"
                className="form-control"
                value={form.managerName}
                onChange={e => set('managerName', e.target.value)}
                placeholder="e.g. Kamal Perera"
                maxLength={200}
                disabled={saving}
              />
            </div>
          </div>

          {/* Active Status */}
          {isEdit && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)}
                disabled={saving}
              />
              <span>Active Branch</span>
            </label>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Branch'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Branches Page ──────────────────────────────────────────────────────
export default function BranchesPage() {
  const [branches, setBranches]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [successMsg, setSuccessMsg]   = useState(null)
  const [search, setSearch]           = useState('')

  const [modal, setModal]             = useState(null) // null | { mode: 'add'|'edit', data? }
  const [saving, setSaving]           = useState(false)
  const [modalError, setModalError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await branchesApi.getAll()
      setBranches(res.data?.data ?? res.data ?? [])
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setError('Access denied. Business Owner role required.')
      } else {
        setError(err.response?.data?.message ?? 'Failed to load branches.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const showToast = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleSave = async (payload) => {
    setSaving(true)
    setModalError(null)
    try {
      if (modal?.mode === 'edit') {
        await branchesApi.update(modal.data.id, payload)
        showToast(`Branch "${payload.name}" updated successfully.`)
      } else {
        await branchesApi.create(payload)
        showToast(`Branch "${payload.name}" created successfully.`)
      }
      setModal(null)
      load()
    } catch (err) {
      setModalError(err.response?.data?.message ?? err.response?.data?.detail ?? 'Failed to save branch.')
    } finally {
      setSaving(false)
    }
  }

  const filtered = branches.filter(b => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.code && b.code.toLowerCase().includes(q)) ||
      (b.city && b.city.toLowerCase().includes(q)) ||
      (b.location && b.location.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Branches Management</h1>
          <p>View and manage store locations, addresses, and status</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={load}
            disabled={loading}
          >
            <RefreshIcon style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModal({ mode: 'add' })}
          >
            <PlusIcon />
            Add Branch
          </button>
        </div>
      </div>

      {/* ── Success Toast ───────────────────────────────────────────────── */}
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
      {error && branches.length > 0 && (
        <ErrorState error={error} onRetry={load} inline />
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="toolbar-card">
        <div className="toolbar-left">
          <div className="search-input-group">
            <SearchIcon />
            <input
              className="search-input"
              type="text"
              placeholder="Search by name, code, or city…"
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
        </div>
      </div>

      {/* ── Table / State ──────────────────────────────────────────────── */}
      {loading ? (
        <TableSkeleton rows={5} columns={6} title="Loading branches…" />
      ) : error && branches.length === 0 ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={load} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={BranchesIcon}
            title={search ? 'No matching branches' : 'No branches created yet'}
            description={
              search
                ? `No branches match "${search}".`
                : 'Create your first branch location to track inventory across multiple stores.'
            }
            actionLabel={!search ? 'Add Branch' : 'Clear Search'}
            actionIcon={!search ? PlusIcon : undefined}
            onAction={!search ? () => setModal({ mode: 'add' }) : () => setSearch('')}
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Branches</span>
              <span className="count-badge">{filtered.length} branches</span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>City</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(branch => (
                  <tr key={branch.id}>
                    <td>
                      <span className="sku-pill">{branch.code}</span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--color-text)' }}>{branch.name}</strong>
                    </td>
                    <td>{branch.city || '—'}</td>
                    <td>
                      {branch.managerName ? (
                        <span>{branch.managerName}<br/><small style={{ color: 'var(--color-text-muted)' }}>{branch.phoneNumber}</small></span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <Badge variant={branch.isActive ? 'active' : 'inactive'}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setModal({ mode: 'edit', data: branch })}
                        >
                          <EditIcon />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ───────────────────────────────────────────── */}
      {modal !== null && (
        <BranchModal
          initial={modal.mode === 'edit' ? modal.data : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setModalError(null) }}
          saving={saving}
          apiError={modalError}
        />
      )}
    </div>
  )
}
