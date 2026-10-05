import React, { useState } from 'react';
import { Award, AlertOctagon, TrendingUp } from 'lucide-react';
import type { TopSellingProduct, SlowMovingProduct } from '../../types/sales';

interface TopSellingWidgetProps {
  products: TopSellingProduct[];
  slowMovers?: SlowMovingProduct[];
}

export const TopSellingWidget: React.FC<TopSellingWidgetProps> = ({ products, slowMovers = [] }) => {
  const [activeTab, setActiveTab] = useState<'fast' | 'slow'>('fast');

  const displayFast = products || [];
  const displaySlow = slowMovers || [];

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
          displayFast.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              <Award size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>No Fast-Moving Sales Yet</div>
              <p style={{ fontSize: '0.78rem', marginTop: 4, margin: '4px 0 0' }}>Top performing products by revenue will appear here once sales transactions are recorded.</p>
            </div>
          ) : (
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
                        Rs. {item.totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          )
        ) : (
          displaySlow.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
              <AlertOctagon size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
              <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>No Slow-Moving Products Flagged</div>
              <p style={{ fontSize: '0.78rem', marginTop: 4, margin: '4px 0 0' }}>Stagnant products with low turnover or high clearance risk will be identified here.</p>
            </div>
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
                        Rs. {item.totalRevenue.toFixed(2)} invoiced
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
          )
        )}
      </div>
    </div>
  );
};
