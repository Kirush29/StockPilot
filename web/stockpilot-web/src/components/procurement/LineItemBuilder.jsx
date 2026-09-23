// LineItemBuilder.jsx — add/remove/edit proposal line items with inline validation
import React from 'react'
import { PlusIcon, TrashIcon } from '../ui/Icons'
import { FormInput, SearchableDropdown } from '../ui/FormControls'
import { formatCurrency } from '../../utils/currencyFormatter'

const EMPTY_ROW = { productId: '', quantity: '1', unitPrice: '' }

export default function LineItemBuilder({ items, onChange, products, errors = {}, disabled }) {
  const productMap = new Map(products.map((p) => [p.productId, p]))

  const setRow = (index, patch) => {
    const next = items.map((row, i) => (i === index ? { ...row, ...patch } : row))
    onChange(next)
  }

  const addRow = () => onChange([...items, { ...EMPTY_ROW }])
  const removeRow = (index) => onChange(items.filter((_, i) => i !== index))

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
        const qty = Number(row.quantity) || 0
        const price = Number(row.unitPrice) || 0
        const product = productMap.get(row.productId)

        return (
          <div className="line-item-row" key={index}>
            <div style={{ flex: 2 }}>
              <SearchableDropdown
                required
                options={products}
                value={row.productId}
                onChange={(val) => setRow(index, { productId: val })}
                error={rowErrors.productId || (rowErrors[`LineItems[${index}].ProductId`] ? rowErrors[`LineItems[${index}].ProductId`][0] : null)}
                placeholder="— Select a product —"
                getOptionValue={(opt) => opt.productId}
                renderOption={(opt) => `${opt.name} (${opt.sku})`}
                disabled={disabled}
              />
              {row.productId && !product && (
                <span className="form-hint" style={{ display: 'block', marginTop: '4px' }}>Not in the loaded catalog — double-check the product.</span>
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

            <div style={{ flex: 1 }}>
              <FormInput
                type="number"
                min="0"
                step="0.01"
                value={row.unitPrice}
                onChange={(e) => setRow(index, { unitPrice: e.target.value })}
                disabled={disabled}
                error={rowErrors.unitPrice || (rowErrors[`LineItems[${index}].UnitPrice`] ? rowErrors[`LineItems[${index}].UnitPrice`][0] : null)}
              />
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
