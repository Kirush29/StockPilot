import React, { useState } from 'react';
import { X, Plus, Trash2, Check, ShoppingCart } from 'lucide-react';
import type { CreateSaleRequest } from '../../types/sales';
import { salesApi } from '../../services/api';

interface RecordSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCreated: () => void;
}

const PRESET_PRODUCTS = [
  { id: '18464716-8fa7-49da-b521-08b1dc057c28', sku: 'SKU-PARACETAMOL-500', name: 'Paracetamol 500mg (100 Tabs)', category: 'Pharmaceuticals', price: 15.50 },
  { id: '13738190-af11-4289-8ad0-bce865d59402', sku: 'SKU-AMOXICILLIN-250', name: 'Amoxicillin 250mg Capsules', category: 'Antibiotics', price: 28.00 },
  { id: '78412e26-739f-4405-8e6c-a7858bea3817', sku: 'SKU-VITAMINC-1000', name: 'Vitamin C 1000mg Effervescent', category: 'Supplements', price: 22.00 },
  { id: '91f24d1a-5b12-4cf0-863a-2395d82046a1', sku: 'SKU-IBUPROFEN-400', name: 'Ibuprofen 400mg Softgels', category: 'Pain Relief', price: 18.25 },
  { id: '52c41829-9e81-42cb-bdfa-345091a18204', sku: 'SKU-OMEPRAZOLE-20', name: 'Omeprazole 20mg Delayed Release', category: 'Gastrointestinal', price: 34.00 }
];

export const RecordSaleModal: React.FC<RecordSaleModalProps> = ({
  isOpen,
  onClose,
  onSaleCreated
}) => {
  const [branchName, setBranchName] = useState('Colombo Central Branch');
  const [paymentMethod, setPaymentMethod] = useState(1);
  const [customerReference] = useState('');
  const [notes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState([
    {
      productId: PRESET_PRODUCTS[0].id,
      productSku: PRESET_PRODUCTS[0].sku,
      productName: PRESET_PRODUCTS[0].name,
      category: PRESET_PRODUCTS[0].category,
      quantity: 5,
      unitPrice: PRESET_PRODUCTS[0].price,
      discountPercent: 0
    }
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    const defaultProduct = PRESET_PRODUCTS[items.length % PRESET_PRODUCTS.length];
    setItems([
      ...items,
      {
        productId: defaultProduct.id,
        productSku: defaultProduct.sku,
        productName: defaultProduct.name,
        category: defaultProduct.category,
        quantity: 1,
        unitPrice: defaultProduct.price,
        discountPercent: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleProductSelect = (index: number, productId: string) => {
    const found = PRESET_PRODUCTS.find((p) => p.id === productId);
    if (!found) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: found.id,
      productSku: found.sku,
      productName: found.name,
      category: found.category,
      unitPrice: found.price
    };
    setItems(newItems);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, qty);
    setItems(newItems);
  };

  const handleDiscountChange = (index: number, discount: number) => {
    const newItems = [...items];
    newItems[index].discountPercent = Math.max(0, Math.min(100, discount));
    setItems(newItems);
  };

  // Calculations
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discountTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discountPercent / 100)), 0);
  const tax = Math.round((subtotal - discountTotal) * 0.05 * 100) / 100;
  const grandTotal = (subtotal - discountTotal) + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: CreateSaleRequest = {
        branchName,
        paymentMethod,
        customerReference: customerReference || undefined,
        notes: notes || undefined,
        items
      };

      await salesApi.createSale(payload);
      onSaleCreated();
      onClose();
    } catch (err: any) {
      alert('Failed to record sale: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, borderRadius: 'var(--radius-sm)', background: 'var(--primary-glow)', color: '#818CF8' }}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', color: '#FFF', margin: 0 }}>Record Sales Transaction</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Store counter & dispatch sales entry</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Branch & Payment Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Branch Location
              </label>
              <select
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFF',
                  fontSize: '0.875rem'
                }}
              >
                <option value="Colombo Central Branch">Colombo Central Branch</option>
                <option value="Kandy Hillside Branch">Kandy Hillside Branch</option>
                <option value="Galle Port Warehouse">Galle Port Warehouse</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  color: '#FFF',
                  fontSize: '0.875rem'
                }}
              >
                <option value={1}>Cash Payment</option>
                <option value={2}>Card / POS Terminal</option>
                <option value={3}>Bank Transfer</option>
                <option value={4}>Digital Wallet</option>
              </select>
            </div>
          </div>

          {/* Line items header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Transaction Line Items ({items.length})
            </span>
            <button
              type="button"
              onClick={handleAddItem}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              <Plus size={14} /> Add Item
            </button>
          </div>

          {/* Items list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {items.map((item, idx) => {
              const lineTotal = (item.quantity * item.unitPrice) * (1 - item.discountPercent / 100);

              return (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1fr 1fr 1fr auto',
                    gap: 10,
                    alignItems: 'center',
                    background: 'rgba(31, 41, 55, 0.4)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px'
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Product</label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#1F2937',
                        border: '1px solid var(--border-subtle)',
                        color: '#FFF',
                        fontSize: '0.8rem'
                      }}
                    >
                      {PRESET_PRODUCTS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#1F2937',
                        border: '1px solid var(--border-subtle)',
                        color: '#FFF',
                        fontSize: '0.8rem',
                        textAlign: 'center'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Disc %</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discountPercent}
                      onChange={(e) => handleDiscountChange(idx, Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#1F2937',
                        border: '1px solid var(--border-subtle)',
                        color: '#FFF',
                        fontSize: '0.8rem',
                        textAlign: 'center'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', textAlign: 'right' }}>Total</label>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFF', textAlign: 'right', paddingTop: 6 }}>
                      ${lineTotal.toFixed(2)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={items.length <= 1}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: items.length <= 1 ? 'var(--text-dim)' : '#FB7185',
                      cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                      padding: 4,
                      marginTop: 14
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Subtotal / Tax / Total breakdown card */}
          <div style={{
            background: 'rgba(31, 41, 55, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            marginBottom: 24
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              <span>Subtotal</span>
              <span style={{ color: '#FFF' }}>${subtotal.toFixed(2)}</span>
            </div>
            {discountTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#34D399', marginBottom: 6 }}>
                <span>Total Discount</span>
                <span>-${discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 10 }}>
              <span>Standard Tax (5%)</span>
              <span style={{ color: '#FFF' }}>+${tax.toFixed(2)}</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#FFF',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: 10
            }}>
              <span>Grand Total</span>
              <span style={{ color: '#34D399' }}>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-emerald" disabled={isSubmitting}>
              <Check size={16} />
              {isSubmitting ? 'Recording Sale...' : `Confirm & Record ($${grandTotal.toFixed(2)})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
