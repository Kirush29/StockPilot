import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Banknote,
  Landmark,
  Download,
  Printer,
  Calendar,
  Building2
} from 'lucide-react';
import type { Sale } from '../../types/sales';

interface SalesLedgerTableProps {
  sales: Sale[];
  isLoading: boolean;
  externalSearch?: string;
}

export const SalesLedgerTable: React.FC<SalesLedgerTableProps> = ({ sales, isLoading, externalSearch }) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'card'>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d'>('all');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const effectiveSearch = externalSearch || internalSearch;

  // Multi-dimensional filtering: Search, Branch, Date Range, Payment Method
  const filteredSales = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

    return sales.filter((sale) => {
      // 1. Text Search
      const searchMatch = !effectiveSearch.trim() ||
        sale.invoiceNumber.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        sale.branchName.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
        (sale.customerReference && sale.customerReference.toLowerCase().includes(effectiveSearch.toLowerCase())) ||
        sale.items.some((i) => i.productName.toLowerCase().includes(effectiveSearch.toLowerCase()) || i.productSku.toLowerCase().includes(effectiveSearch.toLowerCase()));

      if (!searchMatch) return false;

      // 2. Payment Method Filter
      if (paymentFilter === 'cash' && sale.paymentMethod !== 1) return false;
      if (paymentFilter === 'card' && sale.paymentMethod !== 2) return false;

      // 3. Branch Filter
      if (branchFilter !== 'all' && !sale.branchName.toLowerCase().includes(branchFilter.toLowerCase())) {
        return false;
      }

      // 4. Date Range Filter
      const saleDate = new Date(sale.saleDateUtc);
      if (dateFilter === '7d' && saleDate < sevenDaysAgo) return false;
      if (dateFilter === '30d' && saleDate < thirtyDaysAgo) return false;

      return true;
    });
  }, [sales, effectiveSearch, paymentFilter, branchFilter, dateFilter]);

  const toggleExpand = (id: string) => {
    setExpandedSaleId(expandedSaleId === id ? null : id);
  };

  // Excel / CSV Export
  const handleExportCsv = () => {
    if (filteredSales.length === 0) return;

    const headers = ['InvoiceNumber', 'Branch', 'DateUtc', 'Customer', 'PaymentMethod', 'ItemCount', 'SubTotal', 'Discount', 'Tax', 'TotalAmount'];
    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      `"${s.branchName}"`,
      s.saleDateUtc,
      `"${s.customerReference || 'Walk-in'}"`,
      s.paymentMethod === 1 ? 'Cash' : s.paymentMethod === 2 ? 'Card' : 'Bank',
      s.items.length,
      s.subTotal.toFixed(2),
      s.discountAmount.toFixed(2),
      s.taxAmount.toFixed(2),
      s.totalAmount.toFixed(2),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockPilot_Sales_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print / PDF Report
  const handlePrint = () => {
    window.print();
  };

  const renderPaymentIcon = (method: number) => {
    switch (method) {
      case 2:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#4F46E5', fontWeight: 600 }}><CreditCard size={13} /> Card</span>;
      case 3:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#059669', fontWeight: 600 }}><Landmark size={13} /> Bank</span>;
      default:
        return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#D97706', fontWeight: 600 }}><Banknote size={13} /> Cash</span>;
    }
  };

  return (
    <div className="glass-card">
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Sales Invoices Ledger
            </h3>
            <span className="badge badge-primary">
              {filteredSales.length} Transactions
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Audited history of recorded branch sales transactions and line-item allocations
          </p>
        </div>

        {/* Action Controls & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Branch Filter Dropdown */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#F1F5F9',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px'
          }}>
            <Building2 size={13} color="#64748B" />
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="all">All Branches</option>
              <option value="colombo">Colombo Central</option>
              <option value="kandy">Kandy City</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#F1F5F9',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '4px 8px'
          }}>
            <Calendar size={13} color="#64748B" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="all">All Time</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Payment Method Filter Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: '#F1F5F9',
            padding: 3,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)'
          }}>
            {(['all', 'cash', 'card'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPaymentFilter(tab)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  background: paymentFilter === tab ? 'var(--primary-color)' : 'transparent',
                  color: paymentFilter === tab ? '#FFFFFF' : 'var(--text-muted)'
                }}
              >
                {tab === 'all' ? 'All' : tab}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          {!externalSearch && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '5px 10px',
              width: 190
            }}>
              <Search size={14} color="#64748B" />
              <input
                type="text"
                placeholder="Filter ledger..."
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.78rem',
                  width: '100%'
                }}
              />
            </div>
          )}

          {/* Export Options */}
          <button
            className="btn btn-secondary"
            onClick={handleExportCsv}
            title="Export filtered transactions to Excel / CSV"
            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
          >
            <Download size={13} />
            <span>Excel / CSV</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handlePrint}
            title="Print or Export to PDF"
            style={{ fontSize: '0.75rem', padding: '6px 12px' }}
          >
            <Printer size={13} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
          Loading sales transactions...
        </div>
      ) : filteredSales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 36, color: 'var(--text-muted)' }}>
          <FileText size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
          <p style={{ fontSize: '0.88rem' }}>No sales transactions match the active filters.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>Invoice Number</th>
                <th>Branch</th>
                <th>Date & Time</th>
                <th>Customer / Reference</th>
                <th>Payment</th>
                <th>Items</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Tax</th>
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
                      style={{ cursor: 'pointer', background: isExpanded ? '#EFF6FF' : undefined }}
                    >
                      <td>
                        {isExpanded ? <ChevronUp size={15} color="var(--primary-color)" /> : <ChevronDown size={15} color="#64748B" />}
                      </td>
                      <td>
                        <strong style={{ color: 'var(--primary-color)', fontSize: '0.82rem' }}>{sale.invoiceNumber}</strong>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sale.branchName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{saleDate}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {sale.customerReference || 'Walk-in Customer'}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{renderPaymentIcon(sale.paymentMethod)}</td>
                      <td>
                        <span className="badge badge-primary">
                          {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${sale.subTotal.toFixed(2)}</td>
                      <td style={{ fontSize: '0.8rem', color: sale.discountAmount > 0 ? '#059669' : 'var(--text-muted)' }}>
                        -${sale.discountAmount.toFixed(2)}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>+${sale.taxAmount.toFixed(2)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          ${sale.totalAmount.toFixed(2)}
                        </strong>
                      </td>
                    </tr>

                    {/* Expandable line items */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={11} style={{ padding: '0 0 14px 38px', background: '#F8FAFC' }}>
                          <div style={{
                            background: '#FFFFFF',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            padding: 14,
                            marginTop: 6
                          }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                              Invoice Line Items ({sale.items.length})
                            </div>
                            <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                                  <th style={{ padding: '5px 8px' }}>Product</th>
                                  <th style={{ padding: '5px 8px' }}>SKU</th>
                                  <th style={{ padding: '5px 8px' }}>Category</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'center' }}>Quantity</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'right' }}>Unit Price</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'right' }}>Discount</th>
                                  <th style={{ padding: '5px 8px', textAlign: 'right' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sale.items.map((item, idx) => (
                                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <td style={{ padding: '7px 8px', color: 'var(--text-primary)', fontWeight: 600 }}>{item.productName}</td>
                                    <td style={{ padding: '7px 8px', color: 'var(--text-muted)' }}><code>{item.productSku}</code></td>
                                    <td style={{ padding: '7px 8px', color: 'var(--text-muted)' }}>{item.category}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>${item.unitPrice.toFixed(2)}</td>
                                    <td style={{ padding: '7px 8px', textAlign: 'right', color: item.discountPercent > 0 ? '#059669' : 'inherit' }}>
                                      {item.discountPercent}%
                                    </td>
                                    <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>
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
