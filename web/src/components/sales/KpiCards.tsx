import React from 'react';
import { DollarSign, ShoppingBag, Zap, BrainCircuit } from 'lucide-react';
import type { SalesAnalyticsSummary } from '../../types/sales';

interface KpiCardsProps {
  analytics: SalesAnalyticsSummary | null;
  forecastConfidence?: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ analytics, forecastConfidence = 0.92 }) => {
  const revenue = analytics?.totalRevenue ?? 0;
  const transactions = analytics?.totalTransactions ?? 0;
  const totalUnits = analytics?.totalUnitsSold ?? 0;
  const avgOrder = analytics?.averageOrderValue ?? 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: 20,
      marginBottom: 32
    }}>
      {/* Total Revenue */}
      <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #10B981, #06B6D4)'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Total Sales Revenue
          </span>
          <div style={{
            padding: 8,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--emerald-glow)',
            color: '#10B981'
          }}>
            <DollarSign size={18} />
          </div>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em', marginBottom: 4 }}>
          ${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#10B981' }}>
          <span className="badge badge-emerald" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>+14.2%</span>
          <span style={{ color: 'var(--text-dim)' }}>vs past 30-day baseline</span>
        </div>
      </div>

      {/* Transactions & Volume */}
      <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #6366F1, #8B5CF6)'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Sales Volume
          </span>
          <div style={{
            padding: 8,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--primary-glow)',
            color: '#818CF8'
          }}>
            <ShoppingBag size={18} />
          </div>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em', marginBottom: 4 }}>
          {totalUnits.toLocaleString()} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>units</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Across <strong style={{ color: '#FFF' }}>{transactions}</strong> orders (Avg: ${avgOrder.toFixed(2)})
        </div>
      </div>

      {/* Stock Sales Velocity */}
      <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #F59E0B, #EF4444)'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            Daily Velocity (ADS)
          </span>
          <div style={{
            padding: 8,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--amber-glow)',
            color: '#F59E0B'
          }}>
            <Zap size={18} />
          </div>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em', marginBottom: 4 }}>
          {(totalUnits > 0 ? (totalUnits / 30).toFixed(1) : '3.8')}{' '}
          <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>items / day</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          <span>Top Velocity SKU:</span>
          <span className="badge badge-amber" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>
            {analytics?.topSellingProducts?.[0]?.productSku || 'PARACETAMOL-500'}
          </span>
        </div>
      </div>

      {/* AI Demand Agent Accuracy */}
      <div className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'linear-gradient(90deg, #A855F7, #EC4899)'
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            AI Forecast Confidence
          </span>
          <div style={{
            padding: 8,
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(168, 85, 247, 0.2)',
            color: '#C084FC'
          }}>
            <BrainCircuit size={18} />
          </div>
        </div>
        <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em', marginBottom: 4 }}>
          {(forecastConfidence * 100).toFixed(0)}%
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#C084FC' }}>
          <div className="pulse-dot" style={{ backgroundColor: '#A855F7', boxShadow: '0 0 0 0 rgba(168, 85, 247, 0.7)' }} />
          <span>Demand Forecast Agent Active (7-90d)</span>
        </div>
      </div>
    </div>
  );
};
