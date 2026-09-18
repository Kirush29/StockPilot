// LineItemBuilder.jsx — add/remove/edit proposal line items with inline validation
import React from 'react'
import { PlusIcon, TrashIcon } from '../ui/Icons'

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
        <span>Unit Price ($)</span>
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
            <div>
              <select
                className={`form-control ${rowErrors.productId ? 'error' : ''}`}
                value={row.productId}
                onChange={(e) => setRow(index, { productId: e.target.value })}
                disabled={disabled}
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
              {rowErrors.productId && <span className="form-error">{rowErrors.productId}</span>}
              {row.productId && !product && (
                <span className="form-hint">Not in the loaded catalog — double-check the product.</span>
              )}
            </div>

            <div>
              <input
                type="number"
                min="1"
                step="1"
                className={`form-control ${rowErrors.quantity ? 'error' : ''}`}
                value={row.quantity}
                onChange={(e) => setRow(index, { quantity: e.target.value })}
                disabled={disabled}
              />
              {rowErrors.quantity && <span className="form-error">{rowErrors.quantity}</span>}
            </div>

            <div>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`form-control ${rowErrors.unitPrice ? 'error' : ''}`}
                value={row.unitPrice}
                onChange={(e) => setRow(index, { unitPrice: e.target.value })}
                disabled={disabled}
              />
              {rowErrors.unitPrice && <span className="form-error">{rowErrors.unitPrice}</span>}
            </div>

            <div className="line-item-total">${(qty * price).toFixed(2)}</div>

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
          Total Estimated Cost: <strong>${total.toFixed(2)}</strong>
        </div>
      </div>
    </div>
  )
}
