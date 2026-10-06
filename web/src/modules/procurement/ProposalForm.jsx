import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { proposalsApi } from '../../api/procurementApi'
import { productsApi, branchesApi } from '../../api/inventoryApi'
import { supplierService } from '../suppliers/services/supplierService'
import { quotationService } from '../suppliers/services/quotationService'
import LineItemBuilder from './components/LineItemBuilder'
import ErrorState from '../../components/ui/ErrorState'
import { FormInput, SearchableDropdown } from '../../components/ui/FormControls'
import { AlertCircleIcon } from '../../components/ui/Icons'
import '../../shared/theme/inventory.css'
import './procurement.css'

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMPTY_LINE_ITEM = { productId: '', quantity: '1', unitPrice: '' }

/**
 * @param {object} [initial] - An existing ProposalDetailResponse to edit. Omit to create new.
 */
export default function ProposalForm({ initial }) {
  const isEdit = !!initial
  const navigate = useNavigate()

  const [products, setProducts] = useState([])
  const [branches, setBranches] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [quotations, setQuotations] = useState([])
  const [productsError, setProductsError] = useState(null)

  const [branchId, setBranchId] = useState(initial?.branchId ?? '')
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? '')
  const [quotationId, setQuotationId] = useState(initial?.quotationId ?? '')
  const [justification, setJustification] = useState(initial?.justification ?? '')
  const [lineItems, setLineItems] = useState(() =>
    initial?.lineItems?.length
      ? initial.lineItems.map((li) => ({ productId: li.productId, quantity: String(li.quantity), unitPrice: String(li.unitPrice) }))
      : [{ ...EMPTY_LINE_ITEM }]
  )

  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [prodRes, brRes, suppRes, quotRes] = await Promise.all([
        productsApi.getAll(),
        branchesApi.getAll().catch(() => ({ data: [] })),
        supplierService.getAllSuppliers().catch(() => []),
        quotationService.getAllQuotations().catch(() => []),
      ])
      setProducts(prodRes.data?.data ?? prodRes.data ?? [])
      setBranches(brRes.data?.data ?? brRes.data ?? [])

      const rawSuppliers = suppRes?.data ?? suppRes ?? []
      setSuppliers(Array.isArray(rawSuppliers) ? rawSuppliers : [])

      const rawQuotations = quotRes?.data ?? quotRes ?? []
      setQuotations(Array.isArray(rawQuotations) ? rawQuotations : [])
    } catch {
      setProductsError('Could not load required catalogs (Products or Branches). Please refresh and try again.')
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const validate = () => {
    const e = {}
    if (!isEdit && !branchId.trim()) e.branchId = 'Branch is required.'
    else if (!isEdit && !GUID_RE.test(branchId.trim())) e.branchId = 'Must be a valid branch ID (GUID).'

    if (!supplierId.trim()) e.supplierId = 'Supplier is required.'
    else if (!GUID_RE.test(supplierId.trim())) e.supplierId = 'Must be a valid supplier ID (GUID).'

    if (quotationId.trim() && !GUID_RE.test(quotationId.trim())) e.quotationId = 'Must be a valid quotation ID (GUID).'

    const lineErrors = {}
    lineItems.forEach((row, i) => {
      const rowErrors = {}
      if (!row.productId) rowErrors.productId = 'Required.'
      const qty = Number(row.quantity)
      if (row.quantity === '' || !Number.isInteger(qty) || qty <= 0) rowErrors.quantity = 'Must be a positive whole number.'
      const price = Number(row.unitPrice)
      if (row.unitPrice === '' || isNaN(price) || price < 0) rowErrors.unitPrice = 'Must be 0 or greater.'
      if (Object.keys(rowErrors).length) lineErrors[i] = rowErrors
    })
    if (lineItems.length === 0) lineErrors.general = 'Add at least one line item.'
    if (Object.keys(lineErrors).length) e.lineItems = lineErrors

    return e
  }

  const handleSubmit = async (submitForApproval) => {
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setSaving(true)
    setApiError(null)

    const lineItemsPayload = lineItems.map((row) => ({
      productId: row.productId,
      quantity: parseInt(row.quantity, 10),
      unitPrice: parseFloat(row.unitPrice),
    }))

    try {
      if (isEdit) {
        await proposalsApi.update(initial.id, {
          supplierId: supplierId.trim(),
          quotationId: quotationId.trim() || null,
          justification: justification.trim() || null,
          lineItems: lineItemsPayload,
          submitForApproval,
        })
        navigate(`/procurement/proposals/${initial.id}`)
      } else {
        const res = await proposalsApi.create({
          branchId: branchId.trim(),
          supplierId: supplierId.trim(),
          quotationId: quotationId.trim() || null,
          justification: justification.trim() || null,
          createdByAgent: false,
          lineItems: lineItemsPayload,
          submitForApproval,
        })
        navigate(`/procurement/proposals/${res.data.id}`)
      }
    } catch (err) {
      const status = err.response?.status
      if (status === 401 || status === 403) {
        setApiError('You do not have permission to save this proposal.')
      } else if (status === 409) {
        setApiError(err.response?.data?.detail ?? 'This proposal can no longer be edited in its current status.')
      } else if (status === 400 && err.response?.data?.errors) {
        setErrors(err.response.data.errors)
        setApiError('Please fix the validation errors below.')
      } else {
        const problem = err.response?.data
        const fieldErrors = problem?.errors
          ? Object.entries(problem.errors).map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`).join(' | ')
          : null
        setApiError(fieldErrors ?? problem?.detail ?? problem?.title ?? 'Failed to save the proposal.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSupplierSelect = (val) => {
    setSupplierId(val)
    const activeQ = quotations.find((q) => (q.id ?? q.Id) === quotationId)
    if (activeQ && (activeQ.supplierId ?? activeQ.SupplierId) !== val) {
      setQuotationId('')
    }
  }

  const supplierQuotations = supplierId
    ? quotations.filter((q) => {
        const sid = q.supplierId ?? q.SupplierId
        const status = q.status ?? q.Status
        return sid === supplierId && status !== 'Rejected'
      })
    : quotations.filter((q) => {
        const status = q.status ?? q.Status
        return status !== 'Rejected'
      })

  const activeQuotation = quotations.find((q) => (q.id ?? q.Id) === quotationId.trim())

  const applyQuotation = (q) => {
    if (!q) return
    const qSupplierId = q.supplierId ?? q.SupplierId
    const qProductId = q.productId ?? q.ProductId
    const qUnitPrice = q.unitPrice ?? q.UnitPrice
    const qQuantity = q.quantity ?? q.Quantity

    if (qSupplierId && supplierId !== qSupplierId) {
      setSupplierId(qSupplierId)
    }

    setLineItems((prev) => {
      if (prev.length === 0 || (prev.length === 1 && !prev[0].productId)) {
        return [
          {
            productId: qProductId || '',
            quantity: prev[0]?.quantity && prev[0].quantity !== '1' ? prev[0].quantity : (qQuantity ? String(qQuantity) : '1'),
            unitPrice: qUnitPrice !== undefined && qUnitPrice !== null ? String(qUnitPrice) : '',
          },
        ]
      }

      const existingIndex = prev.findIndex((item) => item.productId === qProductId)
      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? {
                ...item,
                unitPrice: String(qUnitPrice),
                ...(item.quantity === '1' && qQuantity ? { quantity: String(qQuantity) } : {}),
              }
            : item
        )
      }

      if (!prev[0].productId) {
        return prev.map((item, idx) =>
          idx === 0
            ? {
                productId: qProductId,
                quantity: item.quantity && item.quantity !== '1' ? item.quantity : (qQuantity ? String(qQuantity) : '1'),
                unitPrice: String(qUnitPrice),
              }
            : item
        )
      }

      return prev
    })
  }

  const handleQuotationSelect = (val) => {
    setQuotationId(val)
    if (!val) return
    const q = quotations.find((x) => (x.id ?? x.Id) === val)
    if (q) {
      applyQuotation(q)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-text">
          <h1>{isEdit ? 'Edit Proposal' : 'New Procurement Proposal'}</h1>
          <p>{isEdit ? 'Update line items and resubmit for approval' : 'Draft a proposal for a branch and supplier, then submit it for review'}</p>
        </div>
      </div>

      {productsError && <ErrorState error={productsError} onRetry={loadData} inline />}
      {apiError && (
        <div className="error-banner" role="alert">
          <div className="error-banner-content">
            <AlertCircleIcon />
            <span>{apiError}</span>
          </div>
        </div>
      )}

      <div className="detail-card">
        <h3>Proposal Details</h3>
        <div className="form-row">
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="proposal-branch-select">
              Branch <span className="required">*</span>
            </label>
            <select
              id="proposal-branch-select"
              className={`form-control ${errors.branchId || (errors.BranchId ? 'error' : '')}`}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              disabled={saving || isEdit}
            >
              <option value="">Select a branch…</option>
              {branches.map((b) => {
                const id = b.branchId ?? b.id
                const code = b.branchCode ?? b.code
                return (
                  <option key={id} value={id}>
                    {b.name} {code ? `(${code})` : ''}
                  </option>
                )
              })}
            </select>
            {(errors.branchId || (errors.BranchId ? errors.BranchId[0] : null)) && (
              <span className="form-error">{errors.branchId || errors.BranchId[0]}</span>
            )}
            {isEdit && <span className="form-hint" style={{ display: 'block', marginTop: '4px' }}>Branch cannot be changed after a proposal is created.</span>}
          </div>

          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="proposal-supplier-select">
              Supplier <span className="required">*</span>
            </label>
            <select
              id="proposal-supplier-select"
              className={`form-control ${errors.supplierId || (errors.SupplierId ? 'error' : '')}`}
              value={supplierId}
              onChange={(e) => handleSupplierSelect(e.target.value)}
              disabled={saving}
            >
              <option value="">Select a supplier…</option>
              {suppliers.map((s) => {
                const id = s.id ?? s.Id
                return (
                  <option key={id} value={id}>
                    {s.name ?? s.Name}
                  </option>
                )
              })}
            </select>
            {(errors.supplierId || (errors.SupplierId ? errors.SupplierId[0] : null)) && (
              <span className="form-error">{errors.supplierId || errors.SupplierId[0]}</span>
            )}
          </div>
        </div>

        <div className="form-group" style={{ marginTop: 'var(--space-4)' }}>
          <label htmlFor="proposal-quotation-select">
            Quotation <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85em', marginLeft: '4px' }}>(Optional)</span>
          </label>
          <select
            id="proposal-quotation-select"
            className={`form-control ${errors.quotationId || (errors.QuotationId ? 'error' : '')}`}
            value={quotationId}
            onChange={(e) => handleQuotationSelect(e.target.value)}
            disabled={saving}
          >
            <option value="">
              {!supplierId
                ? 'Select a supplier first to view quotations…'
                : supplierQuotations.length === 0
                ? 'No active quotations for this supplier'
                : 'Select quotation…'}
            </option>
            {supplierQuotations.map((q) => {
              const id = q.id ?? q.Id
              const prodId = q.productId ?? q.ProductId
              const prod = products.find((p) => (p.productId ?? p.ProductId ?? p.id) === prodId)
              const prodName = prod ? (prod.name ?? prod.Name) : 'Product'
              const price = q.unitPrice ?? q.UnitPrice ?? 0
              const days = q.deliveryDays ?? q.DeliveryDays
              const daysText = days ? ` - ${days} days` : ''
              return (
                <option key={id} value={id}>
                  {`${prodName} - Rs.${Number(price).toLocaleString()}${daysText}`}
                </option>
              )
            })}
          </select>
          {(errors.quotationId || (errors.QuotationId ? errors.QuotationId[0] : null)) && (
            <span className="form-error">{errors.quotationId || errors.QuotationId[0]}</span>
          )}
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <label className="form-label" htmlFor="proposal-justification">Justification</label>
          <textarea
            id="proposal-justification"
            className="form-control"
            rows={3}
            maxLength={2000}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Why is this purchase needed?"
            disabled={saving}
          />
        </div>
      </div>

      <div className="detail-card">
        <h3>Line Items</h3>
        <LineItemBuilder
          items={lineItems}
          onChange={setLineItems}
          products={products}
          errors={errors.lineItems ?? {}}
          disabled={saving}
          supplierId={supplierId}
          quotationId={quotationId}
          activeQuotation={activeQuotation}
          quotations={quotations}
        />
      </div>

      <div className="page-header-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => handleSubmit(false)} disabled={saving}>
          {saving ? 'Saving…' : 'Save as Draft'}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(true)} disabled={saving}>
          {saving ? 'Submitting…' : 'Submit for Approval'}
        </button>
      </div>
    </div>
  )
}
