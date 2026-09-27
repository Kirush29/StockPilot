import React from 'react';
import { AlertTriangle, CheckCircle, Clock, ShoppingCart } from 'lucide-react';
import type { ReorderSuggestion } from '../../types/sales';

interface ReorderTableProps {
  suggestions: ReorderSuggestion[];
  onDraftPurchaseProposal?: (suggestion: ReorderSuggestion) => void;
}

export const ReorderTable: React.FC<ReorderTableProps> = ({
  suggestions,
  onDraftPurchaseProposal
}) => {
  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Reorder Point (ROP) & Replenishment Alerts
            </h3>
            <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>
              Automated Replenishment
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Deterministic Formula: <code>ROP = (Lead Time &times; ADS) + Safety Stock</code>
          </p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
          <CheckCircle size={32} color="#059669" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: '0.88rem' }}>All stock levels are optimal. No reorder points breached.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Item & SKU</th>
                <th>Branch</th>
                <th>Current Stock</th>
                <th>Daily Velocity</th>
                <th>Lead Time</th>
                <th>Safety Buffer</th>
                <th>ROP Threshold</th>
                <th>Suggested Reorder Date</th>
                <th>Urgency Status</th>
                <th style={{ textAlign: 'right' }}>Replenishment Action</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((item) => {
                const isCritical = item.urgencyLevel === 'Critical';
                const isWarning = item.urgencyLevel === 'Warning';
                const stockRatio = Math.min(100, Math.round((item.currentStock / Math.max(item.reorderPoint * 1.5, 1)) * 100));

                return (
                  <tr key={item.productId}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{item.productName}</div>
                      <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.productSku}</code>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.branchName}</td>
                    <td>
                      <div>
                        <strong style={{ color: item.currentStock <= item.reorderPoint ? '#DC2626' : 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {item.currentStock} units
                        </strong>
                        {/* Mini Stock Gauge */}
                        <div style={{ width: 60, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginTop: 4 }}>
                          <div style={{
                            width: `${stockRatio}%`,
                            height: '100%',
                            backgroundColor: isCritical ? '#DC2626' : isWarning ? '#D97706' : '#059669',
                            borderRadius: 2
                          }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.averageDailySales.toFixed(1)} / day</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.leadTimeDays}d</td>
                    <td style={{ fontSize: '0.8rem', color: '#D97706', fontWeight: 600 }}>{item.safetyStock} units</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#D97706', fontSize: '0.85rem' }}>
                        {item.reorderPoint} units
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: isCritical ? '#DC2626' : '#D97706' }}>
                        {new Date(Date.now() + Math.max(1, item.daysOfSupplyRemaining - item.leadTimeDays) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        {item.daysOfSupplyRemaining <= item.leadTimeDays ? 'Reorder Immediately' : `In ${Math.max(1, item.daysOfSupplyRemaining - item.leadTimeDays)} days`}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${isCritical ? 'badge-rose' : isWarning ? 'badge-amber' : 'badge-emerald'}`}>
                        {isCritical ? <AlertTriangle size={11} /> : isWarning ? <Clock size={11} /> : <CheckCircle size={11} />}
                        {item.urgencyLevel} ({item.daysOfSupplyRemaining}d)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.75rem',
                          borderColor: isCritical ? '#FECACA' : 'var(--border-subtle)',
                          backgroundColor: isCritical ? '#FEF2F2' : undefined,
                          color: isCritical ? '#DC2626' : 'var(--text-primary)'
                        }}
                        onClick={() => {
                          if (onDraftPurchaseProposal) {
                            onDraftPurchaseProposal(item);
                          }
                        }}
                      >
                        <ShoppingCart size={13} />
                        <span>Draft Proposal</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
