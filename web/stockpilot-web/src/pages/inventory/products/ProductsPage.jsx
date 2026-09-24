// ProductsPage.jsx — Polished SaaS Product Management
import React, { useState, useEffect, useCallback } from 'react'
import { productsApi, categoriesApi } from '../../../api/inventoryApi'
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
  TrashIcon,
  CloseIcon,
  ProductsIcon,
} from '../../../components/ui/Icons'
import { FormInput } from '../../../components/ui/FormControls'
import { formatCurrency } from '../../../utils/currencyFormatter'
import '../../../styles/inventory.css'

const EMPTY_FORM = {
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  unit: '',
  costPrice: '',
  sellingPrice: '',
  minimumStockLevel: '',
  reorderLevel: '',
  maximumStockLevel: '',
  isActive: true,
}

// ── Add / Edit Product Modal ────────────────────────────────────────────────
function ProductModal({ initial, categories, onSave, onClose, saving, apiError, fieldErrors }) {
  const isEdit = !!initial
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name ?? '',
          sku: initial.sku ?? '',
          barcode: initial.barcode ?? '',
          categoryId: initial.categoryId ?? '',
          unit: initial.unit ?? '',
          costPrice: String(initial.costPrice ?? ''),
          sellingPrice: String(initial.sellingPrice ?? ''),
          minimumStockLevel: String(initial.minimumStockLevel ?? ''),
          reorderLevel: String(initial.reorderLevel ?? ''),
          maximumStockLevel: String(initial.maximumStockLevel ?? ''),
          isActive: initial.isActive ?? true,
        }
      : EMPTY_FORM
  )
  const [localErrors, setLocalErrors] = useState({})

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    setLocalErrors(e => ({ ...e, [field]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Product name is required.'
    if (!form.sku.trim()) e.sku = 'SKU is required.'
    if (!form.categoryId) e.categoryId = 'Category is required.'
    if (!form.unit.trim()) e.unit = 'Unit is required (e.g. pcs, kg, box).'

    const cost   = parseFloat(form.costPrice)
    const sell   = parseFloat(form.sellingPrice)
    const minQty = parseFloat(form.minimumStockLevel)
    const reord  = parseFloat(form.reorderLevel)
    const maxQty = parseFloat(form.maximumStockLevel)

    if (form.costPrice === '' || isNaN(cost) || cost < 0) e.costPrice = 'Must be 0 or greater.'
    if (form.sellingPrice === '' || isNaN(sell) || sell < 0) e.sellingPrice = 'Must be 0 or greater.'
    if (form.minimumStockLevel !== '' && (isNaN(minQty) || minQty < 0)) e.minimumStockLevel = 'Must be 0 or greater.'
    if (form.reorderLevel !== '' && (isNaN(reord) || reord < 0)) e.reorderLevel = 'Must be 0 or greater.'
    if (form.maximumStockLevel !== '' && (isNaN(maxQty) || maxQty < 0)) e.maximumStockLevel = 'Must be 0 or greater.'
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
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      categoryId: form.categoryId,
      unit: form.unit.trim(),
      costPrice: parseFloat(form.costPrice) || 0,
      sellingPrice: parseFloat(form.sellingPrice) || 0,
      minimumStockLevel: parseFloat(form.minimumStockLevel) || 0,
      reorderLevel: parseFloat(form.reorderLevel) || 0,
      maximumStockLevel: parseFloat(form.maximumStockLevel) || 0,
      isActive: form.isActive,
    })
  }

  return (
    <Modal
      title={isEdit ? 'Edit Product' : 'Add New Product'}
      subtitle={isEdit ? `Update properties for ${initial.name}` : 'Fill in the details to register a new product'}
      onClose={onClose}
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit}>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {apiError && <ErrorState error={apiError} inline />}

          {/* Product Name */}
          <FormInput
            label="Product Name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            error={localErrors.name || fieldErrors?.name}
            placeholder="e.g. Wireless Barcode Scanner"
            maxLength={300}
            disabled={saving}
            required
          />

          {/* SKU & Barcode */}
          <div className="form-row">
            <FormInput
              label="SKU"
              value={form.sku}
              onChange={e => set('sku', e.target.value)}
              error={localErrors.sku || fieldErrors?.sku}
              placeholder="e.g. SCAN-WL-01"
              maxLength={100}
              disabled={saving}
              required
            />

            <FormInput
              label="Barcode / UPC"
              value={form.barcode}
              onChange={e => set('barcode', e.target.value)}
              error={localErrors.barcode || fieldErrors?.barcode}
              placeholder="e.g. 012345678905"
              maxLength={100}
              disabled={saving}
              optionalText
            />
          </div>

          {/* Category & Unit */}
          <div className="form-row">
            <div className="form-group">
              <label>Category <span className="required">*</span></label>
              <select
                className={`form-control ${localErrors.categoryId || fieldErrors?.categoryId ? 'error' : ''}`}
                value={form.categoryId}
                onChange={e => set('categoryId', e.target.value)}
                disabled={saving}
              >
                <option value="">Select a category…</option>
                {categories.map(c => (
                  <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                ))}
              </select>
              {(localErrors.categoryId || fieldErrors?.categoryId) && <span className="form-error">{localErrors.categoryId || fieldErrors?.categoryId}</span>}
            </div>

            <FormInput
              label="Unit of Measure"
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
              error={localErrors.unit || fieldErrors?.unit}
              placeholder="e.g. pcs, box, kg"
              maxLength={50}
              disabled={saving}
              required
            />
          </div>

          {/* Cost Price & Selling Price */}
          <div className="form-row">
            <FormInput
              label="Cost Price (Rs.)"
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={e => set('costPrice', e.target.value)}
              error={localErrors.costPrice || fieldErrors?.costPrice}
              placeholder="0.00"
              disabled={saving}
              required
            />

            <FormInput
              label="Selling Price (Rs.)"
              type="number"
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={e => set('sellingPrice', e.target.value)}
              error={localErrors.sellingPrice || fieldErrors?.sellingPrice}
              placeholder="0.00"
              disabled={saving}
              required
            />
          </div>

          {/* Stock Levels Thresholds */}
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <FormInput
              label="Min Stock"
              type="number"
              min="0"
              step="1"
              value={form.minimumStockLevel}
              onChange={e => set('minimumStockLevel', e.target.value)}
              error={localErrors.minimumStockLevel || fieldErrors?.minimumStockLevel}
              placeholder="0"
              disabled={saving}
            />

            <FormInput
              label="Reorder Level"
              type="number"
              min="0"
              step="1"
              value={form.reorderLevel}
              onChange={e => set('reorderLevel', e.target.value)}
              error={localErrors.reorderLevel || fieldErrors?.reorderLevel}
              placeholder="0"
              disabled={saving}
            />

            <FormInput
              label="Max Stock"
              type="number"
              min="0"
              step="1"
              value={form.maximumStockLevel}
              onChange={e => set('maximumStockLevel', e.target.value)}
              error={localErrors.maximumStockLevel || fieldErrors?.maximumStockLevel}
              placeholder="0"
              disabled={saving}
            />
          </div>

          {/* Active Checkbox */}
          {isEdit && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)}
                disabled={saving}
              />
              <span>Active Product Status</span>
            </label>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Deactivate Confirmation Modal ───────────────────────────────────────────
function DeactivateModal({ product, onConfirm, onClose, saving }) {
  return (
    <Modal
      title="Deactivate Product"
      subtitle="Are you sure you want to deactivate this item?"
      onClose={onClose}
      maxWidth="460px"
    >
      <div className="modal-body">
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
          Deactivating <strong>{product?.name}</strong> (<span className="sku-pill">{product?.sku}</span>) will prevent new purchase orders and stock receipts for this product.
        </p>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => onConfirm(product.productId)}
          disabled={saving}
        >
          {saving ? 'Deactivating…' : 'Deactivate Product'}
        </button>
      </div>
    </Modal>
  )
}

// ── Main Products Page Component ────────────────────────────────────────────
export default function ProductsPage() {
  const [products, setProducts]         = useState([])
  const [categories, setCategories]     = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [successMsg, setSuccessMsg]     = useState(null)
  const [search, setSearch]             = useState('')
  const [categoryFilter, setCatFilter]  = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Modal states: null | { mode: 'add'|'edit'|'deactivate', data?: any }
  const [modal, setModal]               = useState(null)
  const [saving, setSaving]             = useState(false)
  const [modalError, setModalError]     = useState(null)
  const [modalFieldErrors, setModalFieldErrors] = useState({})

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [prodRes, catRes] = await Promise.all([
        productsApi.getAll(showInactive),
        categoriesApi.getAll().catch(() => ({ data: { data: [] } })),
      ])
      setProducts(prodRes.data?.data ?? [])
      setCategories(catRes.data?.data ?? [])
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setError('Access denied. Authentication required. (AUTH-INTEGRATION-POINT)')
      } else {
        setError(err.response?.data?.message ?? 'Failed to load product catalog.')
      }
    } finally {
      setLoading(false)
    }
  }, [showInactive])

  useEffect(() => {
    loadData()
  }, [loadData])

  const showToast = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const handleSaveProduct = async (payload) => {
    setSaving(true)
    setModalError(null)
    setModalFieldErrors({})
    try {
      if (modal?.mode === 'edit') {
        await productsApi.update(modal.data.productId, payload)
        showToast(`Product "${payload.name}" updated successfully.`)
      } else {
        await productsApi.create(payload)
        showToast(`Product "${payload.name}" created successfully.`)
      }
      setModal(null)
      loadData()
    } catch (err) {
      setModalError(err.displayMessage || 'Failed to save product.')
      if (err.fieldErrors) {
        setModalFieldErrors(err.fieldErrors)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (id) => {
    setSaving(true)
    try {
      await productsApi.deactivate(id)
      showToast('Product deactivated successfully.')
      setModal(null)
      loadData()
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to deactivate product.')
    } finally {
      setSaving(false)
    }
  }

  // Filter products in memory
  const categoryMap = new Map(categories.map(c => [c.categoryId, c.name]))
  const filtered = products.filter(p => {
    if (categoryFilter && p.categoryId !== categoryFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-text">
          <h1>Products</h1>
          <p>Manage product catalog, SKUs, pricing, and reorder thresholds</p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={loadData}
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
            Add Product
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
      {error && products.length > 0 && (
        <ErrorState error={error} onRetry={loadData} inline />
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="toolbar-card">
        <div className="toolbar-left">
          <div className="search-input-group">
            <SearchIcon />
            <input
              className="search-input"
              type="text"
              placeholder="Search by product name, SKU, or barcode…"
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

          <select
            className="form-control"
            style={{ flex: '0 0 190px' }}
            value={categoryFilter}
            onChange={e => setCatFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
            ))}
          </select>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            <span>Show Inactive</span>
          </label>

          {(search || categoryFilter) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setCatFilter('') }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* ── Products Table / State ─────────────────────────────────────── */}
      {loading ? (
        <TableSkeleton rows={6} columns={8} title="Loading products catalog…" />
      ) : error && products.length === 0 ? (
        <div className="table-card">
          <ErrorState error={error} onRetry={loadData} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="table-card">
          <EmptyState
            icon={ProductsIcon}
            title={search || categoryFilter ? 'No products match your criteria' : 'No products registered yet'}
            description={
              search || categoryFilter
                ? 'Try adjusting your search query or category filter.'
                : 'Get started by creating your first product.'
            }
            actionLabel={!search && !categoryFilter ? 'Add Product' : 'Clear Filters'}
            actionIcon={!search && !categoryFilter ? PlusIcon : undefined}
            onAction={!search && !categoryFilter ? () => setModal({ mode: 'add' }) : () => { setSearch(''); setCatFilter('') }}
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-card-header">
            <div className="table-card-title">
              <span>Products Catalog</span>
              <span className="count-badge">{filtered.length} products</span>
            </div>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                  <th style={{ textAlign: 'right' }}>Price</th>
                  <th style={{ textAlign: 'right' }}>Reorder Lvl</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.productId}>
                    <td>
                      <strong style={{ color: 'var(--color-text)' }}>{p.name}</strong>
                    </td>
                    <td>
                      <span className="sku-pill">{p.sku}</span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
                      {p.barcode || '—'}
                    </td>
                    <td>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                        {categoryMap.get(p.categoryId) ?? '—'}
                      </span>
                    </td>
                    <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {p.unit}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(p.costPrice)}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <strong>{formatCurrency(p.sellingPrice)}</strong>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {p.reorderLevel}
                    </td>
                    <td>
                      <Badge variant={p.isActive ? 'active' : 'inactive'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setModal({ mode: 'edit', data: p })}
                          title="Edit Product"
                        >
                          <EditIcon />
                          Edit
                        </button>
                        {p.isActive && (
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => setModal({ mode: 'deactivate', data: p })}
                            title="Deactivate Product"
                          >
                            <TrashIcon />
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
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {(modal?.mode === 'add' || modal?.mode === 'edit') && (
        <ProductModal
          initial={modal.mode === 'edit' ? modal.data : null}
          categories={categories}
          onSave={handleSaveProduct}
          onClose={() => { setModal(null); setModalError(null); setModalFieldErrors({}) }}
          saving={saving}
          apiError={modalError}
          fieldErrors={modalFieldErrors}
        />
      )}

      {modal?.mode === 'deactivate' && (
        <DeactivateModal
          product={modal.data}
          onConfirm={handleDeactivate}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}
