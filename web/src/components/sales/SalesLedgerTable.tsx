import React, { useState } from 'react';
import { FileText, Search, ChevronDown, ChevronUp, CreditCard, Banknote, Landmark } from 'lucide-react';
import type { Sale } from '../../types/sales';

interface SalesLedgerTableProps {
  sales: Sale[];
  isLoading: boolean;
}

export const SalesLedgerTable: React.FC<SalesLedgerTableProps> = ({ sales, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const filteredSales = sales.filter((sale) =>
    sale.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.branchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.items.some((i) => i.productName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleExpand = (id: string) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  const renderPaymentIcon = (method: number) => {
    switch (method) {
      case 2:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CreditCard size={14} color="#818CF8" /> Card</span>;
      case 3:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Landmark size={14} color="#34D399" /> Bank</span>;
      default:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Banknote size={14} color="#FBBF24" /> Cash</span>;
    }
  };

  return (
    <div className="glass-card">
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20
      }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', color: '#FFF', margin: 0 }}>
            Sales Transaction Ledger
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Audited history of recorded branch sales and customer orders
          </p>
        </div>

        {/* Search bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(31, 41, 55, 0.6)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '6px 14px',
          width: 280
        }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search invoice, branch, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#FFF',
              fontSize: '0.85rem',
              width: '100%'
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          Loading sales transactions...
        </div>
      ) : filteredSales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <FileText size={36} style={{ marginBottom: 12, opacity: 0.5 }} />
          <p>No sales transactions found.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Invoice Number</th>
                <th>Branch</th>
                <th>Date & Time</th>
                <th>Payment</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Tax (5%)</th>
                <th style={{ textAlign: 'right' }}>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.map((sale) => {
                const isExpanded = expandedSaleId === sale.id;
                const saleDate = new Date(sale.saleDateUtc).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <React.Fragment key={sale.id}>
                    <tr
                      onClick={() => toggleExpand(sale.id)}
                      style={{ cursor: 'pointer', background: isExpanded ? 'rgba(99, 102, 241, 0.05)' : undefined }}
                    >
                      <td>
                        {isExpanded ? <ChevronUp size={16} color="var(--primary)" /> : <ChevronDown size={16} color="var(--text-dim)" />}
                      </td>
                      <td>
                        <strong style={{ color: '#A5B4FC' }}>{sale.invoiceNumber}</strong>
                      </td>
                      <td>{sale.branchName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{saleDate}</td>
                      <td>{renderPaymentIcon(sale.paymentMethod)}</td>
                      <td>
                        <span className="badge badge-primary">
                          {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td>${sale.subTotal.toFixed(2)}</td>
                      <td style={{ color: sale.discountAmount > 0 ? '#34D399' : 'var(--text-dim)' }}>
                        -${sale.discountAmount.toFixed(2)}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>+${sale.taxAmount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: '#FFF', fontSize: '1rem' }}>
                          ${sale.totalAmount.toFixed(2)}
                        </strong>
                      </td>
                    </tr>

                    {/* Expandable line items */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} style={{ padding: '0 0 16px 48px', background: 'rgba(99, 102, 241, 0.03)' }}>
                          <div style={{
                            background: 'rgba(17, 24, 39, 0.9)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: 16,
                            marginTop: 8
                          }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                              Invoice Line Items ({sale.items.length})
                            </div>
                            <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ color: 'var(--text-dim)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                                  <th style={{ padding: '6px 8px' }}>Product</th>
                                  <th style={{ padding: '6px 8px' }}>SKU</th>
                                  <th style={{ padding: '6px 8px' }}>Category</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Quantity</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Unit Price</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Discount</th>
                                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.items.map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                    <td style={{ padding: '8px', color: '#FFF', fontWeight: 500 }}>{item.productName}</td>
                                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}><code>{item.productSku}</code></td>
                                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{item.category}</td>
                                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                                    <td style={{ padding: '8px', textAlign: 'right' }}>${item.unitPrice.toFixed(2)}</td>
                                    <td style={{ padding: '8px', textAlign: 'right', color: item.discountPercent > 0 ? '#34D399' : 'inherit' }}>
                                      {item.discountPercent}%
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, color: '#FFF' }}>
                                      ${(item.totalPrice ?? (item.quantity * item.unitPrice * (1 - item.discountPercent / 100))).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
