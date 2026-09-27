import React, { useState } from 'react';
import { Users, Repeat, ShoppingBag, Award, Sparkles } from 'lucide-react';
import type { CustomerBehaviorSummary, TopCustomer, CoPurchasedItem } from '../../types/sales';

interface CustomerBehaviorWidgetProps {
  behavior: CustomerBehaviorSummary | null;
}

export const CustomerBehaviorWidget: React.FC<CustomerBehaviorWidgetProps> = ({ behavior }) => {
  const [activeTab, setActiveTab] = useState<'topCustomers' | 'coPurchased'>('topCustomers');

  // Fallback demo data if empty
  const defaultBehavior: CustomerBehaviorSummary = {
    totalUniqueCustomers: 42,
    repeatCustomerRate: 66.7,
    topCustomers: [
      { customerReference: 'Asiri Surgical Hospital', orderCount: 18, totalSpend: 8450.00, lastPurchaseDateUtc: new Date().toISOString() },
      { customerReference: 'Lanka Hospitals PLC', orderCount: 14, totalSpend: 6280.00, lastPurchaseDateUtc: new Date().toISOString() },
      { customerReference: 'Nawaloka Medicare', orderCount: 11, totalSpend: 4920.00, lastPurchaseDateUtc: new Date().toISOString() },
      { customerReference: 'Durdans Hospital Pharmacy', orderCount: 8, totalSpend: 3650.00, lastPurchaseDateUtc: new Date().toISOString() },
      { customerReference: 'Hemas Hospital Wattala', orderCount: 6, totalSpend: 2890.00, lastPurchaseDateUtc: new Date().toISOString() },
    ],
    productsBoughtTogether: [
      {
        primaryProductName: 'Paracetamol 500mg',
        primaryProductSku: 'SKU-PARACETAMOL-500',
        secondaryProductName: 'Vitamin C 1000mg',
        secondaryProductSku: 'SKU-VITAMINC-1000',
        coOccurrenceCount: 34
      },
      {
        primaryProductName: 'Amoxicillin 250mg',
        primaryProductSku: 'SKU-AMOXICILLIN-250',
        secondaryProductName: 'Surgical Masks (Box)',
        secondaryProductSku: 'SKU-MASKS-SURG-50',
        coOccurrenceCount: 22
      },
      {
        primaryProductName: 'Paracetamol 500mg',
        primaryProductSku: 'SKU-PARACETAMOL-500',
        secondaryProductName: 'Digital Thermometer',
        secondaryProductSku: 'SKU-THERMO-DIGITAL',
        coOccurrenceCount: 18
      }
    ]
  };

  const data = behavior || defaultBehavior;
  const topCustomers: TopCustomer[] = data.topCustomers || [];
  const coPurchased: CoPurchasedItem[] = data.productsBoughtTogether || [];

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
        gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: 'rgba(0, 104, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-color)'
          }}>
            <Users size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Customer Purchasing Behavior
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Loyalty Metrics & Market-Basket Bundling
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: '#F1F5F9',
          padding: 3,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveTab('topCustomers')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: '0.74rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'topCustomers' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'topCustomers' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Award size={13} />
            <span>Top 5 Customers</span>
          </button>
          <button
            onClick={() => setActiveTab('coPurchased')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 4,
              fontSize: '0.74rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'coPurchased' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'coPurchased' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <ShoppingBag size={13} />
            <span>Bought Together</span>
          </button>
        </div>
      </div>

      {/* Repeat Customer Rate Highlight Pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        backgroundColor: '#F0FDF4',
        borderRadius: 6,
        border: '1px solid #BBF7D0',
        marginBottom: 14,
        fontSize: '0.75rem',
        color: '#15803D'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Repeat size={14} color="#16A34A" />
          <span>
            Repeat Purchase Rate: <strong>{data.repeatCustomerRate.toFixed(1)}%</strong>
          </span>
        </div>
        <span style={{ fontWeight: 600, color: '#16A34A' }}>
          {data.totalUniqueCustomers} unique recorded customers
        </span>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'topCustomers' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 270 }}>
          {topCustomers.slice(0, 5).map((cust: TopCustomer, idx: number) => (
            <div
              key={cust.customerReference || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#F8FAFC',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  backgroundColor: idx === 0 ? '#FEF3C7' : idx === 1 ? '#E0E7FF' : '#F1F5F9',
                  color: idx === 0 ? '#B45309' : idx === 1 ? '#4338CA' : '#475569',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {idx + 1}
                </span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {cust.customerReference}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                    {cust.orderCount} orders this month
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
                  ${cust.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                  Avg ${(cust.totalSpend / Math.max(cust.orderCount, 1)).toFixed(0)}/order
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Frequently Bought Together (Market-Basket Co-occurrence) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', maxHeight: 270 }}>
          {coPurchased.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Multi-item basket co-occurrence calculation active as invoices record.
            </div>
          ) : (
            coPurchased.map((pair: CoPurchasedItem, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#6366F1' }}>
                    <Sparkles size={13} />
                    <span style={{ fontWeight: 600 }}>Frequently Bundled</span>
                  </div>
                  <span className="badge badge-primary" style={{ fontSize: '0.66rem' }}>
                    {pair.coOccurrenceCount} co-purchases
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pair.primaryProductName}</span>
                  <span style={{ color: 'var(--text-muted)' }}>+</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pair.secondaryProductName}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
