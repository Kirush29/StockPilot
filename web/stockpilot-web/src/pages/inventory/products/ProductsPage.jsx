import { useState, useEffect, useCallback } from 'react'
import { productsApi, categoriesApi } from '../../../api/inventoryApi'
import '../../../styles/inventory.css'

// ── Shared state components ───────────────────────────────────────────────────
function Spinner() {
  return <div className="state-container"><div className="spinner" /><p>Loading products…</p></div>
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

// ── Product form modal ────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', sku: '', barcode: '', categoryId: '', unit: '',
  costPrice: '', sellingPrice: '', minimumStockLevel: '',
  reorderLevel: '', maximumStockLevel: '', isActive: true,
}

function ProductModal({ initial, categories, onSave, onClose, saving }) {
  const [form, setForm]     = useState(() => initial
    ? {
        name: initial.name,
        sku: initial.sku,
        barcode: initial.barcode ?? '',
        categoryId: initial.categoryId,
        unit: initial.unit,
        costPrice: String(initial.costPrice),
        sellingPrice: String(initial.sellingPrice),
        minimumStockLevel: String(initial.minimumStockLevel),
        reorderLevel: String(initial.reorderLevel),
        maximumStockLevel: String(initial.maximumStockLevel),
        isActive: initial.isActive,
      }
    : EMPTY_FORM
  )
  const [errors, setErrors] = useState({})

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setErrors(e => ({ ...e, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())       e.name       = 'Name is required.'
    if (!form.sku.trim())        e.sku        = 'SKU is required.'
    if (!form.categoryId)        e.categoryId = 'Category is required.'
    if (!form.unit.trim())       e.unit       = 'Unit is required.'
    const cost   = parseFloat(form.costPrice)
    const sell   = parseFloat(form.sellingPrice)
    const minQty = parseFloat(form.minimumStockLevel)
    const reord  = parseFloat(form.reorderLevel)
    const maxQty = parseFloat(form.maximumStockLevel)
    if (isNaN(cost)   || cost   < 0) e.costPrice          = 'Must be 0 or greater.'
    if (isNaN(sell)   || sell   < 0) e.sellingPrice       = 'Must be 0 or greater.'
    if (isNaN(minQty) || minQty < 0) e.minimumStockLevel  = 'Must be 0 or greater.'
    if (isNaN(reord)  || reord  < 0) e.reorderLevel       = 'Must be 0 or greater.'
    if (isNaN(maxQty) || maxQty < 0) e.maximumStockLevel  = 'Must be 0 or greater.'
    return e
  }

  const handleSubmit = (ev) => {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    onSave({
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: form.categoryId,
      unit: form.unit.trim(),
      costPrice: parseFloat(form.costPrice),
      sellingPrice: parseFloat(form.sellingPrice),
      minimumStockLevel: parseFloat(form.minimumStockLevel),
      reorderLevel: parseFloat(form.reorderLevel),
      maximumStockLevel: parseFloat(form.maximumStockLevel),
      isActive: form.isActive,
    })
  }

  const isEdit = !!initial

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Product' : 'Add Product'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Name */}
            <div className="form-group">
              <label>Name <span className="required">*</span></label>
              <input className={`form-control ${errors.name ? 'error' : ''}`}
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Product name" maxLength={300} />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            {/* SKU + Barcode */}
            <div className="form-row">
              <div className="form-group">
                <label>SKU <span className="required">*</span></label>
                <input className={`form-control ${errors.sku ? 'error' : ''}`}
                  value={form.sku} onChange={e => set('sku', e.target.value)}
                  placeholder="e.g. PROD-001" maxLength={100} />
                {errors.sku && <span className="form-error">{errors.sku}</span>}
              </div>
              <div className="form-group">
                <label>Barcode</label>
                <input className="form-control"
                  value={form.barcode} onChange={e => set('barcode', e.target.value)}
                  placeholder="Optional" maxLength={100} />
              </div>
            </div>

            {/* Category + Unit */}
            <div className="form-row">
              <div className="form-group">
                <label>Category <span className="required">*</span></label>
                <select className={`form-control ${errors.categoryId ? 'error' : ''}`}
                  value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                  <option value="">Select category…</option>
                  {categories.filter(c => c.isActive).map(c => (
                    <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <span className="form-error">{errors.categoryId}</span>}
              </div>
              <div className="form-group">
                <label>Unit <span className="required">*</span></label>
                <input className={`form-control ${errors.unit ? 'error' : ''}`}
                  value={form.unit} onChange={e => set('unit', e.target.value)}
                  placeholder="e.g. pcs, kg, L" maxLength={50} />
                {errors.unit && <span className="form-error">{errors.unit}</span>}
              </div>
            </div>

            {/* Cost + Selling price */}
            <div className="form-row">
              <div className="form-group">
                <label>Cost Price <span className="required">*</span></label>
                <input className={`form-control ${errors.costPrice ? 'error' : ''}`}
                  type="number" min="0" step="0.01"
                  value={form.costPrice} onChange={e => set('costPrice', e.target.value)} />
                {errors.costPrice && <span className="form-error">{errors.costPrice}</span>}
              </div>
              <div className="form-group">
                <label>Selling Price <span className="required">*</span></label>
                <input className={`form-control ${errors.sellingPrice ? 'error' : ''}`}
                  type="number" min="0" step="0.01"
                  value={form.sellingPrice} onChange={e => set('sellingPrice', e.target.value)} />
                {errors.sellingPrice && <span className="form-error">{errors.sellingPrice}</span>}
              </div>
            </div>

            {/* Stock levels */}
            <div className="form-row">
              <div className="form-group">
                <label>Minimum Stock Level <span className="required">*</span></label>
                <input className={`form-control ${errors.minimumStockLevel ? 'error' : ''}`}
                  type="number" min="0" step="0.01"
                  value={form.minimumStockLevel} onChange={e => set('minimumStockLevel', e.target.value)} />
                {errors.minimumStockLevel && <span className="form-error">{errors.minimumStockLevel}</span>}
              </div>
              <div className="form-group">
                <label>Reorder Level <span className="required">*</span></label>
                <input className={`form-control ${errors.reorderLevel ? 'error' : ''}`}
                  type="number" min="0" step="0.01"
                  value={form.reorderLevel} onChange={e => set('reorderLevel', e.target.value)} />
                {errors.reorderLevel && <span className="form-error">{errors.reorderLevel}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Maximum Stock Level <span className="required">*</span></label>
              <input className={`form-control ${errors.maximumStockLevel ? 'error' : ''}`}
                type="number" min="0" step="0.01"
                value={form.maximumStockLevel} onChange={e => set('maximumStockLevel', e.target.value)} />
              {errors.maximumStockLevel && <span className="form-error">{errors.maximumStockLevel}</span>}
            </div>

            {/* Active toggle — edit only */}
            {isEdit && (
              <div className="form-group">
                <label style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', display: 'flex' }}>
                  <input type="checkbox" checked={form.isActive}
                    onChange={e => set('isActive', e.target.checked)} />
                  Active
                </label>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Deactivate confirmation ───────────────────────────────────────────────────
function ConfirmModal({ product, onConfirm, onClose, saving }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Deactivate Product</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to deactivate <strong>{product.name}</strong>?</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            The product will be marked inactive and excluded from new transactions.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={saving}>
            {saving ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts]       = useState([])
  const [categories, setCategories]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [search, setSearch]           = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [modal, setModal]             = useState(null)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [prodRes, catRes] = await Promise.all([
        productsApi.getAll(true),   // include inactive so we can show them
        categoriesApi.getAll(),
      ])
      setProducts(prodRes.data?.data ?? [])
      setCategories(catRes.data?.data ?? [])
    } catch (err) {
      setError(err.response?.data?.message ?? err.message ?? 'Failed to load products.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Client-side filter
  const filtered = products.filter(p => {
    const matchesSearch = !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesActive = showInactive ? true : p.isActive
    return matchesSearch && matchesActive
  })

  const openAdd       = () => { setSaveError(null); setModal({ mode: 'add' }) }
  const openEdit      = (p) => { setSaveError(null); setModal({ mode: 'edit', data: p }) }
  const openDeactivate= (p) => { setSaveError(null); setModal({ mode: 'deactivate', data: p }) }
  const closeModal    = () => setModal(null)

  const handleSave = async (form) => {
    setSaving(true); setSaveError(null)
    try {
      if (modal.mode === 'add') {
        await productsApi.create(form)
      } else {
        await productsApi.update(modal.data.productId, form)
      }
      closeModal()
      await load()
    } catch (err) {
      setSaveError(err.response?.data?.message ?? err.message ?? 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    setSaving(true); setSaveError(null)
    try {
      await productsApi.deactivate(modal.data.productId)
      closeModal()
      await load()
    } catch (err) {
      setSaveError(err.response?.data?.message ?? err.message ?? 'Deactivation failed.')
    } finally {
      setSaving(false)
    }
  }

  const getCategoryName = (id) =>
    categories.find(c => c.categoryId === id)?.name ?? '—'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage your product catalogue</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {error    && <ErrorBanner message={error} onRetry={load} />}
      {saveError && <div className="error-box">⚠ {saveError}</div>}

      {/* Search + filter */}
      {!loading && (
        <div className="search-bar">
          <input
            className="search-input"
            placeholder="Search by name, SKU or barcode…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="table-card">
          <div className="table-card-header">
            <span className="table-card-title">Products ({filtered.length})</span>
          </div>
          {filtered.length === 0 ? (
            <div className="state-container">
              <p>{search ? 'No products match your search.' : 'No products found. Add one to get started.'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Barcode</th>
                    <th>Category</th>
                    <th>Unit</th>
                    <th>Cost</th>
                    <th>Price</th>
                    <th>Reorder Lvl</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.productId}>
                      <td><strong>{p.name}</strong></td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{p.sku}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{p.barcode ?? '—'}</td>
                      <td>{getCategoryName(p.categoryId)}</td>
                      <td>{p.unit}</td>
                      <td>{Number(p.costPrice).toFixed(2)}</td>
                      <td>{Number(p.sellingPrice).toFixed(2)}</td>
                      <td>{p.reorderLevel}</td>
                      <td>
                        <span className={`badge ${p.isActive ? 'badge-active' : 'badge-inactive'}`}>
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}>
                            Edit
                          </button>
                          {p.isActive && (
                            <button className="btn btn-danger btn-sm" onClick={() => openDeactivate(p)}>
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal?.mode === 'add' && (
        <ProductModal
          initial={null}
          categories={categories}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}
      {modal?.mode === 'edit' && (
        <ProductModal
          initial={modal.data}
          categories={categories}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}
      {modal?.mode === 'deactivate' && (
        <ConfirmModal
          product={modal.data}
          onConfirm={handleDeactivate}
          onClose={closeModal}
          saving={saving}
        />
      )}
    </div>
  )
}
