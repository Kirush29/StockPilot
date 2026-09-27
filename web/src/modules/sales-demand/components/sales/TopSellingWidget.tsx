import React, { useState } from 'react';
import { Award, AlertOctagon, TrendingUp } from 'lucide-react';
import type { TopSellingProduct, SlowMovingProduct } from '../../types/sales';

interface TopSellingWidgetProps {
  products: TopSellingProduct[];
  slowMovers?: SlowMovingProduct[];
}

export const TopSellingWidget: React.FC<TopSellingWidgetProps> = ({ products, slowMovers = [] }) => {
  const [activeTab, setActiveTab] = useState<'fast' | 'slow'>('fast');

  // Fallback demo data if products empty
  const defaultItems: TopSellingProduct[] = [
    { productId: '1', productSku: 'SKU-PARACETAMOL-500', productName: 'Paracetamol 500mg', unitsSold: 280, totalRevenue: 6860, velocityCategory: 'Fast Moving' },
    { productId: '2', productSku: 'SKU-AMOXICILLIN-250', productName: 'Amoxicillin 250mg', unitsSold: 180, totalRevenue: 8100, velocityCategory: 'High Value' },
    { productId: '3', productSku: 'SKU-VITAMINC-1000', productName: 'Vitamin C 1000mg', unitsSold: 140, totalRevenue: 4480, velocityCategory: 'Fast Moving' },
    { productId: '4', productSku: 'SKU-MASKS-SURG-50', productName: 'Surgical Masks (Box)', unitsSold: 120, totalRevenue: 1800, velocityCategory: 'Bulk Steady' },
  ];

  const defaultSlowMovers: SlowMovingProduct[] = [
    { productId: '10', productSku: 'SKU-GAUZE-STERILE-10', productName: 'Sterile Gauze Pads 10pk', unitsSold: 4, totalRevenue: 96.0, currentStock: 180, daysSinceLastSale: 42 },
    { productId: '11', productSku: 'SKU-IODINE-TINCTURE-100', productName: 'Iodine Tincture 100ml', unitsSold: 6, totalRevenue: 168.0, currentStock: 95, daysSinceLastSale: 35 },
    { productId: '12', productSku: 'SKU-SYRINGE-5ML-50', productName: 'Disposable Syringes 5ml (50s)', unitsSold: 8, totalRevenue: 240.0, currentStock: 140, daysSinceLastSale: 28 },
  ];

  const displayFast = products && products.length > 0 ? products : defaultItems;
  const displaySlow = slowMovers && slowMovers.length > 0 ? slowMovers : defaultSlowMovers;

  const maxRevenue = Math.max(...displayFast.map((p) => p.totalRevenue), 1);

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Fast/Slow Tab Toggle */}
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
            backgroundColor: activeTab === 'fast' ? 'rgba(0, 104, 255, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: activeTab === 'fast' ? 'var(--primary-color)' : '#EF4444'
          }}>
            {activeTab === 'fast' ? <Award size={16} /> : <AlertOctagon size={16} />}
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {activeTab === 'fast' ? 'Top Selling (Fast Movers)' : 'Slow Moving Items (Sluggish)'}
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {activeTab === 'fast' ? 'Ranked by Invoiced Value' : 'Stagnant Stock / Clearance Risk'}
            </span>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex',
          backgroundColor: '#F1F5F9',
          padding: 3,
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveTab('fast')}
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
              background: activeTab === 'fast' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'fast' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <TrendingUp size={13} />
            <span>Fast Movers</span>
          </button>
          <button
            onClick={() => setActiveTab('slow')}
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
              background: activeTab === 'slow' ? '#EF4444' : 'transparent',
              color: activeTab === 'slow' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <AlertOctagon size={13} />
            <span>Slow Movers</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
        {activeTab === 'fast' ? (
          displayFast.slice(0, 4).map((item, idx) => {
            const percent = Math.round((item.totalRevenue / maxRevenue) * 100);

            return (
              <div key={item.productId || idx} style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#F8FAFC',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? '#FEF3C7' : '#F1F5F9',
                      color: idx === 0 ? '#B45309' : '#64748B',
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
                        {item.productName}
                      </div>
                      <code style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{item.productSku}</code>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>
                      ${item.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {item.unitsSold} units sold
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                  width: '100%',
                  height: 5,
                  backgroundColor: '#E2E8F0',
                  borderRadius: 3,
                  marginTop: 6,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: idx === 0 ? 'linear-gradient(90deg, #0068FF, #38BDF8)' : '#93C5FD',
                    borderRadius: 3
                  }} />
                </div>
              </div>
            );
          })
        ) : (
          displaySlow.slice(0, 4).map((item, idx) => {
            return (
              <div key={item.productId || idx} style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#991B1B' }}>
                      {item.productName}
                    </div>
                    <code style={{ fontSize: '0.68rem', color: '#B91C1C' }}>{item.productSku}</code>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DC2626' }}>
                      {item.unitsSold} units sold
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#7F1D1D' }}>
                      ${item.totalRevenue.toFixed(2)} invoiced
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#B91C1C', marginTop: 4 }}>
                  <span>Holding: <strong>{item.currentStock} units in stock</strong></span>
                  <span className="badge badge-rose" style={{ fontSize: '0.65rem' }}>
                    {item.daysSinceLastSale}d since last sale
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
