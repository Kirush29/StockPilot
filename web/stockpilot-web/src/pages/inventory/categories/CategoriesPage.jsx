import { useState, useEffect, useCallback } from 'react'
import { categoriesApi } from '../../../api/inventoryApi'
import '../../../styles/inventory.css'

// ── Shared state components ───────────────────────────────────────────────────
function Spinner() {
  return <div className="state-container"><div className="spinner" /><p>Loading categories…</p></div>
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="error-box">
      ⚠ {message}
      <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

// ── Category form modal ───────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', description: '', isActive: true }

function CategoryModal({ initial, onSave, onClose, saving }) {
  const [form, setForm]     = useState(initial ?? EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required.'
    return e
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave(form)
  }

  const isEdit = !!initial

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Category' : 'Add Category'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Name <span className="required">*</span></label>
              <input
                className={`form-control ${errors.name ? 'error' : ''}`}
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Electronics"
                maxLength={200}
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                value={form.description ?? ''}
                onChange={e => set('description', e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            {isEdit && (
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => set('isActive', e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />{' '}
                  Active
                </label>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [modal, setModal]           = useState(null)   // null | { mode:'add'|'edit', data? }
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await categoriesApi.getAll()
      setCategories(res.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd  = () => { setSaveError(null); setModal({ mode: 'add' }) }
  const openEdit = (cat) => { setSaveError(null); setModal({ mode: 'edit', data: cat }) }
  const closeModal = () => setModal(null)

  const handleSave = async (form) => {
    setSaving(true); setSaveError(null)
    try {
      if (modal.mode === 'add') {
        await categoriesApi.create({ name: form.name, description: form.description || null })
      } else {
        await categoriesApi.update(modal.data.categoryId, {
          name: form.name,
          description: form.description || null,
          isActive: form.isActive,
        })
      }
      closeModal()
      await load()
    } catch (err) {
      setSaveError(err.response?.data?.message ?? err.message ?? 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <p>Manage product categories</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Category</button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={load} />}
      {saveError && <div className="error-box">⚠ {saveError}</div>}

      {loading ? <Spinner /> : (
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">All Categories ({categories.length})</span>
          </div>
          {categories.length === 0 ? (
            <div className="state-container"><p>No categories found. Add one to get started.</p></div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.categoryId}>
                    <td><strong>{cat.name}</strong></td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{cat.description ?? '—'}</td>
                    <td>
                      <span className={`badge ${cat.isActive ? 'badge-active' : 'badge-inactive'}`}>
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cat)}>
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal && (
        <CategoryModal
          initial={modal.mode === 'edit' ? modal.data : null}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}
    </div>
  )
}
