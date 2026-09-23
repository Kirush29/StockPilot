// ProposalForm.jsx — shared line-item form used by both NewProposalPage and EditProposalPage
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { proposalsApi } from '../../api/procurementApi'
import { productsApi, branchesApi } from '../../api/inventoryApi'
import LineItemBuilder from '../../components/procurement/LineItemBuilder'
import ErrorState from '../../components/ui/ErrorState'
import { FormInput, SearchableDropdown } from '../../components/ui/FormControls'
import { AlertCircleIcon } from '../../components/ui/Icons'
import '../../styles/inventory.css'
import '../../styles/procurement.css'

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
      const [prodRes, brRes] = await Promise.all([
        productsApi.getAll(),
        branchesApi.getAll().catch(() => ({ data: [] }))
      ])
      setProducts(prodRes.data?.data ?? prodRes.data ?? [])
      setBranches(brRes.data?.data ?? brRes.data ?? [])
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
          <div style={{ flex: 1 }}>
            <SearchableDropdown
              label={<span>Branch <span className="required">*</span></span>}
              required
              options={branches}
              value={branchId}
              onChange={setBranchId}
              error={errors.branchId || (errors.BranchId ? errors.BranchId[0] : null)}
              placeholder="— Select a branch —"
              getOptionValue={(opt) => opt.id}
              renderOption={(opt) => `${opt.name} (${opt.code})`}
              disabled={saving || isEdit}
            />
            {isEdit && <span className="form-hint" style={{ display: 'block', marginTop: '4px' }}>Branch cannot be changed after a proposal is created.</span>}
          </div>

          <div style={{ flex: 1 }}>
            <FormInput
              label={<span>Supplier ID <span className="required">*</span></span>}
              required
              type="text"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder="e.g. 22222222-2222-2222-2222-222222222222"
              disabled={saving}
              error={errors.supplierId || (errors.SupplierId ? errors.SupplierId[0] : null)}
            />
          </div>
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <FormInput
            label={<span>Quotation ID <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85em', marginLeft: '4px' }}>(Optional)</span></span>}
            type="text"
            value={quotationId}
            onChange={(e) => setQuotationId(e.target.value)}
            placeholder="Link to a supplier quotation, if one exists"
            disabled={saving}
            error={errors.quotationId || (errors.QuotationId ? errors.QuotationId[0] : null)}
          />
        </div>

        <div style={{ marginTop: 'var(--space-4)' }}>
          <label className="form-label">Justification</label>
          <textarea
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
