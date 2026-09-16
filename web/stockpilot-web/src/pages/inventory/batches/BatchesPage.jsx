import { useState, useEffect, useCallback } from 'react'
import { batchesApi, productsApi } from '../../../api/inventoryApi'
import '../../../styles/inventory.css'

const BATCH_STATUSES = ['Active', 'Expired', 'Damaged', 'Depleted']

const EMPTY_FORM = {
  productId: '', branchId: '', batchNumber: '',
  quantity: '', unitCost: '', manufacturingDate: '', expiryDate: '', receivedDate: '',
}

function statusBadge(status, isExpired, isExpiringSoon) {
  if (isExpired || status === 'Expired')
    return <span className="badge badge-critical">Expired</span>
  if (isExpiringSoon)
    return <span className="badge badge-low">Expiring Soon</span>
  if (status === 'Active')
    return <span className="badge badge-ok">Active</span>
  return <span className="badge badge-inactive">{status}</span>
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}

function toInputDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

function BatchModal({ batch, products, onClose, onSaved }) {
  const isEdit = !!batch
  const [form, setForm] = useState(() => {
    if (isEdit) return {
      productId: batch.productId,
      branchId: batch.branchId,
      batchNumber: batch.batchNumber,
      quantity: String(batch.quantity),
      unitCost: String(batch.unitCost),
      manufacturingDate: toInputDate(batch.manufacturingDate),
      expiryDate: toInputDate(batch.expiryDate),
      receivedDate: toInputDate(batch.receivedDate),
      status: batch.status,
    }
    return { ...EMPTY_FORM, status: 'Active' }
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState(null)

  // Derive unique branches from products list — products carry no branch info,
  // so we collect branches from already-loaded batches via props
  const set = f => v => setForm(p => ({ ...p, [f]: v }))

  function validate() {
    const e = {}
    if (!form.productId)    e.productId    = 'Product is required.'
    if (!form.branchId)     e.branchId     = 'Branch ID is required.'
    if (!form.batchNumber.trim()) e.batchNumber = 'Batch number is required.'
    if (form.quantity === '' || Number(form.quantity) < 0) e.quantity = 'Quantity must be ≥ 0.'
    if (!form.expiryDate)   e.expiryDate   = 'Expiry date is required.'
    else if (isNaN(new Date(form.expiryDate))) e.expiryDate = 'Invalid expiry date.'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setSaving(true)
    setApiError(null)
    try {
      const payload = {
        productId: form.productId,
        branchId: form.branchId,
        batchNumber: form.batchNumber.trim(),
        quantity: Number(form.quantity),
        unitCost: Number(form.unitCost) || 0,
        manufacturingDate: form.manufacturingDate || null,
        expiryDate: form.expiryDate || null,
        receivedDate: form.receivedDate || null,
      }
      if (isEdit) {
        await batchesApi.update(batch.batchId, {
          quantity: payload.quantity,
          unitCost: payload.unitCost,
          manufacturingDate: payload.manufacturingDate,
          expiryDate: payload.expiryDate,
          status: form.status,
        })
      } else {
        await batchesApi.create(payload)
      }
      onSaved()
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setApiError('Access denied. Authentication required. (AUTH-INTEGRATION-POINT)')
      } else {
        setApiError(err.response?.data?.message ?? 'Save failed.')
      }
    } finally {
      setSaving(false)
    }
  }

  const F = ({ name, label, required, children }) => (
    <div className="form-group">
      <label>{label}{required && <span className="required"> *</span>}</label>
      {children}
      {errors[name] && <span className="form-error">{errors[name]}</span>}
    </div>
  )

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Batch' : 'Add Batch'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {apiError && <div className="error-box">⚠ {apiError}</div>}

            {!isEdit && (
              <>
                <F name="productId" label="Product" required>
                  <select
                    className={`form-control${errors.productId ? ' error' : ''}`}
                    value={form.productId}
                    onChange={e => set('productId')(e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {products.map(p => (
                      <option key={p.productId} value={p.productId}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </F>
                <F name="branchId" label="Branch ID" required>
                  <input
                    className={`form-control${errors.branchId ? ' error' : ''}`}
                    placeholder="Paste branch UUID…"
                    value={form.branchId}
                    onChange={e => set('branchId')(e.target.value)}
                  />
                </F>
                <F name="batchNumber" label="Batch Number" required>
                  <input
                    className={`form-control${errors.batchNumber ? ' error' : ''}`}
                    value={form.batchNumber}
                    onChange={e => set('batchNumber')(e.target.value)}
                  />
                </F>
              </>
            )}

            <div className="form-row">
              <F name="quantity" label="Quantity" required>
                <input
                  type="number" min="0" step="any"
                  className={`form-control${errors.quantity ? ' error' : ''}`}
                  value={form.quantity}
                  onChange={e => set('quantity')(e.target.value)}
                />
              </F>
              <F name="unitCost" label="Unit Cost">
                <input
                  type="number" min="0" step="any"
                  className="form-control"
                  value={form.unitCost}
                  onChange={e => set('unitCost')(e.target.value)}
                />
              </F>
            </div>

            <div className="form-row">
              <F name="manufacturingDate" label="Manufacturing Date">
                <input
                  type="date" className="form-control"
                  value={form.manufacturingDate}
                  onChange={e => set('manufacturingDate')(e.target.value)}
                />
              </F>
              <F name="expiryDate" label="Expiry Date" required>
                <input
                  type="date"
                  className={`form-control${errors.expiryDate ? ' error' : ''}`}
                  value={form.expiryDate}
                  onChange={e => set('expiryDate')(e.target.value)}
                />
              </F>
            </div>

            {!isEdit && (
              <F name="receivedDate" label="Received Date">
                <input
                  type="date" className="form-control"
                  value={form.receivedDate}
                  onChange={e => set('receivedDate')(e.target.value)}
                />
              </F>
            )}

            {isEdit && (
              <F name="status" label="Status">
                <select
                  className="form-control"
                  value={form.status}
                  onChange={e => set('status')(e.target.value)}
                >
                  {BATCH_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </F>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BatchesPage() {
  const [batches, setBatches]   = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [filter, setFilter]     = useState('all') // all | expiring | expired
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)  // null | { batch? }

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let res
      if (filter === 'expiring') res = await batchesApi.getExpiring()
      else if (filter === 'expired') res = await batchesApi.getExpired()
      else res = await batchesApi.getAll()
      setBatches(res.data?.data ?? [])
    } catch (e) {
      const status = e.response?.status
      if (status === 401 || status === 403) {
        setError('Access denied. Authentication required. (AUTH-INTEGRATION-POINT)')
      } else {
        setError(e.response?.data?.message ?? 'Failed to load batches.')
      }
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    productsApi.getAll(false).then(r => setProducts(r.data?.data ?? [])).catch(() => {})
  }, [])

  useEffect(() => { fetchBatches() }, [fetchBatches])

  const visible = batches.filter(b => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      b.batchNumber.toLowerCase().includes(q) ||
      b.productName.toLowerCase().includes(q) ||
      b.branchName.toLowerCase().includes(q)
    )
  })

  function handleSaved() {
    setModal(null)
    fetchBatches()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Batches</h1>
          <p>Manage product batches and track expiry</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={fetchBatches} disabled={loading}>↻ Refresh</button>
          <button className="btn btn-primary" onClick={() => setModal({})}>+ Add Batch</button>
        </div>
      </div>

      <div className="search-bar">
        <input
          className="search-input"
          placeholder="Search batch number, product, branch…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {['all', 'expiring', 'expired'].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'expiring' ? 'Expiring Soon' : 'Expired'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-box">⚠ {error}</div>}

      <div className="table-card">
        <div className="table-card-header">
          <span className="table-card-title">
            {filter === 'expiring' ? 'Expiring Soon' : filter === 'expired' ? 'Expired Batches' : 'All Batches'}
            {!loading && ` (${visible.length})`}
          </span>
        </div>

        {loading ? (
          <div className="state-container"><div className="spinner" /></div>
        ) : visible.length === 0 ? (
          <div className="state-container"><p>No batches found.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch #</th>
                <th>Product</th>
                <th>Branch</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Mfg Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(b => (
                <tr key={b.batchId}>
                  <td style={{ fontFamily: 'monospace' }}>{b.batchNumber}</td>
                  <td>{b.productName}<br /><small style={{ color: 'var(--color-text-muted)' }}>{b.sku}</small></td>
                  <td>{b.branchName}</td>
                  <td>{b.quantity}</td>
                  <td>{b.unitCost.toFixed(2)}</td>
                  <td>{fmt(b.manufacturingDate)}</td>
                  <td>{fmt(b.expiryDate)}</td>
                  <td>{statusBadge(b.status, b.isExpired, b.isExpiringSoon)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => setModal({ batch: b })}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal !== null && (
        <BatchModal
          batch={modal.batch ?? null}
          products={products}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
