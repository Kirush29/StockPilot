// LineItemBuilder.jsx — add/remove/edit proposal line items with inline validation
import React from 'react'
import { PlusIcon, TrashIcon } from '../../../components/ui/Icons'
import { FormInput, SearchableDropdown } from '../../../components/ui/FormControls'
import { formatCurrency } from '../../../utils/currencyFormatter'

const EMPTY_ROW = { productId: '', quantity: '1', unitPrice: '' }

export default function LineItemBuilder({
  items,
  onChange,
  products,
  errors = {},
  disabled,
  supplierId = '',
  quotationId = '',
  activeQuotation = null,
  quotations = [],
}) {
  const productMap = new Map(products.map((p) => [p.productId ?? p.ProductId, p]))

  const setRow = (index, patch) => {
    const next = items.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  const addRow = () => onChange([...items, { ...EMPTY_ROW }])
  const removeRow = (index) => onChange(items.filter((_, i) => i !== index))

  const handleProductChange = (index, prodId) => {
    const selectedProduct = productMap.get(prodId)
    const currentRow = items[index]
    let newPrice = currentRow.unitPrice

    // 1. If an active proposal quotation matches this product (or single quotation linked)
    if (
      activeQuotation &&
      ((activeQuotation.productId ?? activeQuotation.ProductId) === prodId || !activeQuotation.productId)
    ) {
      newPrice = String(activeQuotation.unitPrice ?? activeQuotation.UnitPrice ?? '')
    }
    // 2. Or if there is a quotation from the selected supplier for this product
    else if (supplierId && quotations?.length) {
      const match = quotations.find(
        (q) =>
          ((q.supplierId ?? q.SupplierId) === supplierId || !supplierId) &&
          (q.productId ?? q.ProductId) === prodId
      )
      if (match) {
        newPrice = String(match.unitPrice ?? match.UnitPrice ?? '')
      }
    }

    // 3. Fallback to product catalog cost price if unitPrice is empty or 0
    if ((!newPrice || Number(newPrice) === 0) && selectedProduct) {
      const cost = selectedProduct.costPrice ?? selectedProduct.CostPrice
      if (cost && Number(cost) > 0) {
        newPrice = String(cost)
      }
    }

    setRow(index, { productId: prodId, unitPrice: newPrice })
  }

  const isRowQuotationLocked = (row) => {
    if (!row.productId) return false
    if (activeQuotation) {
      const qProdId = activeQuotation.productId ?? activeQuotation.ProductId
      if (qProdId === row.productId || !qProdId) return true
    }
    if (quotationId && quotations?.length) {
      const q = quotations.find((x) => (x.id ?? x.Id) === quotationId.trim())
      if (q && (q.productId ?? q.ProductId) === row.productId) return true
    }
    return false
  }

  const total = items.reduce((sum, row) => {
    const qty = Number(row.quantity) || 0
    const price = Number(row.unitPrice) || 0
    return sum + qty * price
  }, 0)

  return (
    <div className="line-item-builder">
      <div className="line-item-header">
        <span>Product</span>
        <span>Quantity</span>
        <span>Unit Price (Rs.)</span>
        <span>Line Total</span>
        <span />
      </div>

      {items.map((row, index) => {
        const rowErrors = errors[index] ?? {}
        const isLocked = isRowQuotationLocked(row)
        const qty = Number(row.quantity) || 0
        const price = Number(row.unitPrice) || 0
        const product = productMap.get(row.productId)

        return (
          <div className="line-item-row" key={index}>
            <div style={{ flex: 2 }}>
              <select
                id={`line-item-product-${index}`}
                aria-label="Product"
                className={`form-control ${rowErrors.productId || (rowErrors[`LineItems[${index}].ProductId`] ? 'error' : '')}`}
                value={row.productId}
                onChange={(e) => handleProductChange(index, e.target.value)}
                disabled={disabled}
              >
                <option value="">Select a product…</option>
                {products.map((p) => {
                  const id = p.productId ?? p.ProductId ?? p.id
                  const sku = p.sku ?? p.SKU
                  return (
                    <option key={id} value={id}>
                      {p.name ?? p.Name} {sku ? `(${sku})` : ''}
                    </option>
                  )
                })}
              </select>
              {row.productId && !product && (
                <span className="form-hint" style={{ display: 'block', marginTop: '4px' }}>Not in the loaded catalog — double-check the product.</span>
              )}
              {(rowErrors.productId || (rowErrors[`LineItems[${index}].ProductId`] ? rowErrors[`LineItems[${index}].ProductId`][0] : null)) && (
                <span className="form-error">
                  {rowErrors.productId || rowErrors[`LineItems[${index}].ProductId`][0]}
                </span>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <FormInput
                type="number"
                min="1"
                step="1"
                value={row.quantity}
                onChange={(e) => setRow(index, { quantity: e.target.value })}
                disabled={disabled}
                error={rowErrors.quantity || (rowErrors[`LineItems[${index}].Quantity`] ? rowErrors[`LineItems[${index}].Quantity`][0] : null)}
              />
            </div>

            <div style={{ flex: 1, position: 'relative' }}>
              <FormInput
                type="number"
                min="0"
                step="0.01"
                value={row.unitPrice}
                onChange={(e) => setRow(index, { unitPrice: e.target.value })}
                disabled={disabled}
                readOnly={isLocked}
                title={isLocked ? 'Unit price is locked to the selected quotation.' : undefined}
                className={isLocked ? 'line-item-price-locked' : ''}
                style={isLocked ? { backgroundColor: 'var(--color-surface-subtle, #f8fafc)', cursor: 'not-allowed' } : undefined}
                error={rowErrors.unitPrice || (rowErrors[`LineItems[${index}].UnitPrice`] ? rowErrors[`LineItems[${index}].UnitPrice`][0] : null)}
              />
              {isLocked && (
                <div
                  className="quotation-lock-hint"
                  title="Unit price locked from official supplier quotation"
                >
                  <span>🔒</span> Quotation price
                </div>
              )}
            </div>

            <div className="line-item-total">{formatCurrency(qty * price)}</div>

            <div>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => removeRow(index)}
                disabled={disabled || items.length <= 1}
                title="Remove line item"
                aria-label="Remove line item"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        )
      })}

      {errors.general && <div className="form-error" style={{ marginTop: 'var(--space-2)' }}>{errors.general}</div>}

      <div className="line-item-footer">
        <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} disabled={disabled}>
          <PlusIcon />
          Add Line Item
        </button>
        <div className="line-item-grand-total">
          Total Estimated Cost: <strong>{formatCurrency(total)}</strong>
        </div>
      </div>
    </div>
  )
}
