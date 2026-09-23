// CategoriesPage.jsx — Polished SaaS Category Management
import React, { useState, useEffect, useCallback } from 'react'
import { categoriesApi } from '../../../api/inventoryApi'
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
  CategoriesIcon,
} from '../../../components/ui/Icons'
import { FormInput } from '../../../components/ui/FormControls'
import '../../../styles/inventory.css'

const EMPTY_CATEGORY_FORM = { name: '', description: '', isActive: true }

// ── Add / Edit Category Modal ───────────────────────────────────────────────
function CategoryModal({ initial, onSave, onClose, saving, apiError, fieldErrors }) {
  const isEdit = !!initial
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name ?? '',
          description: initial.description ?? '',
          isActive: initial.isActive ?? true,
        }
      : EMPTY_CATEGORY_FORM
  )
  const [localErrors, setLocalErrors] = useState({})

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setLocalErrors(e => ({ ...e, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Category name is required.'
    return e
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setLocalErrors(errs)
      return
    }
    onSave({
      name: form.name.trim(),
      description: form.description?.trim() || null,
      isActive: form.isActive,
    })
  }

  return (
    <Modal
      title={isEdit ? 'Edit Category' : 'Add Category'}
      subtitle={isEdit ? `Update properties for ${initial.name}` : 'Create a new category for grouping inventory products'}
      onClose={onClose}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {apiError && (
            <ErrorState error={apiError} inline />
          )}

          <FormInput
            label="Category Name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            error={localErrors.name || fieldErrors?.name}
            placeholder="e.g. Perishables, Electronics, Packaging"
            maxLength={200}
            disabled={saving}
            required
          />

          <div className="form-group">
            <label>
                Description
                <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85em', marginLeft: '4px' }}>
                    (Optional)
                </span>
            </label>
            <textarea
              className={`form-control ${fieldErrors?.description ? 'error' : ''}`}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Optional notes or description regarding this category…"
              rows={3}
              disabled={saving}
            />
            {fieldErrors?.description && <span className="form-error">{fieldErrors.description}</span>}
          </div>

          {isEdit && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)}
                disabled={saving}
              />
              <span>Active Category</span>
            </label>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Main Categories Page ────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [categories, setCategories]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [successMsg, setSuccessMsg]   = useState(null)
  const [search, setSearch]           = useState('')

  const [modal, setModal]             = useState(null) // null | { mode: 'add'|'edit', data? }
  const [saving, setSaving]           = useState(false)
  const [modalError, setModalError]   = useState(null)
  const [modalFieldErrors, setModalFieldErrors] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await categoriesApi.getAll()
      setCategories(res.data?.data ?? [])
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setError('Access denied. Authentication required. (AUTH-INTEGRATION-POINT)')
      } else {
        setError(err.response?.data?.message ?? 'Failed to load categories.')
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
    setModalFieldErrors({})
    try {
      if (modal?.mode === 'edit') {
        await categoriesApi.update(modal.data.categoryId, payload)
        showToast(`Category "${payload.name}" updated successfully.`)
      } else {
        await categoriesApi.create(payload)
        showToast(`Category "${payload.name}" created successfully.`)
      }
      setModal(null)
      load()
    } catch (err) {
      setModalError(err.displayMessage || 'Failed to save category.')
      if (err.fieldErrors) {
        setModalFieldErrors(err.fieldErrors)
      }
    } finally {
      setSaving(false)
    }
  }

  const filtered = categories.filter(c => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Product Categories</h1>
          <p>Organize products into hierarchical groupings for tracking and filtering</p>
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
            Add Category
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
      {error && categories.length > 0 && (
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
              placeholder="Search categories by name or description…"
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
        <TableSkeleton rows={5} columns={4} title="Loading product categories…" />
      ) : error && categories.length === 0 ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={load} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={CategoriesIcon}
            title={search ? 'No matching categories' : 'No categories created yet'}
            description={
              search
                ? `No categories match "${search}".`
                : 'Create your first category to start organizing your product inventory.'
            }
            actionLabel={!search ? 'Add Category' : 'Clear Search'}
            actionIcon={!search ? PlusIcon : undefined}
            onAction={!search ? () => setModal({ mode: 'add' }) : () => setSearch('')}
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Categories</span>
              <span className="count-badge">{filtered.length} categories</span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(cat => (
                  <tr key={cat.categoryId}>
                    <td>
                      <strong style={{ color: 'var(--color-text)' }}>{cat.name}</strong>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', maxWidth: '400px' }}>
                      {cat.description || '—'}
                    </td>
                    <td>
                      <Badge variant={cat.isActive ? 'active' : 'inactive'}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setModal({ mode: 'edit', data: cat })}
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
        <CategoryModal
          initial={modal.mode === 'edit' ? modal.data : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setModalError(null); setModalFieldErrors({}) }}
          saving={saving}
          apiError={modalError}
          fieldErrors={modalFieldErrors}
        />
      )}
    </div>
  )
}
