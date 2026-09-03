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
    <div className="glass-card" style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: '1.25rem', color: '#FFF', margin: 0 }}>
              Reorder Point (ROP) & Safety Stock Alerts
            </h2>
            <span className="badge badge-amber">
              Deterministic Math Engine
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Formula: <code>ROP = (Lead Time × ADS) + Safety Stock</code>
          </p>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          <CheckCircle size={36} color="#10B981" style={{ marginBottom: 12 }} />
          <p>All stock levels are optimal. No reorder points breached.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product & SKU</th>
                <th>Branch</th>
                <th>Current Stock</th>
                <th>Avg Daily Sales</th>
                <th>Lead Time</th>
                <th>Safety Stock</th>
                <th>Reorder Point (ROP)</th>
                <th>Urgency Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {suggestions.map((item) => {
                const isCritical = item.urgencyLevel === 'Critical';
                const isWarning = item.urgencyLevel === 'Warning';

                return (
                  <tr key={item.productId}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#FFF' }}>{item.productName}</div>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.productSku}</code>
                    </td>
                    <td>{item.branchName}</td>
                    <td>
                      <strong style={{ color: item.currentStock <= item.reorderPoint ? '#FB7185' : '#FFF' }}>
                        {item.currentStock} units
                      </strong>
                    </td>
                    <td>{item.averageDailySales.toFixed(1)} / day</td>
                    <td>{item.leadTimeDays} days</td>
                    <td>{item.safetyStock} units</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#FBBF24' }}>
                        {item.reorderPoint} units
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isCritical ? 'badge-rose' : isWarning ? 'badge-amber' : 'badge-emerald'}`}>
                        {isCritical ? <AlertTriangle size={12} /> : isWarning ? <Clock size={12} /> : <CheckCircle size={12} />}
                        {item.urgencyLevel} ({item.daysOfSupplyRemaining}d left)
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          borderColor: isCritical ? 'rgba(244, 63, 94, 0.4)' : 'var(--border-subtle)'
                        }}
                        onClick={() => {
                          if (onDraftPurchaseProposal) {
                            onDraftPurchaseProposal(item);
                          } else {
                            alert(`Purchase proposal draft prepared for ${item.productName} (${item.recommendedOrderQuantity} units) to feed into Procurement Coordinator Agent!`);
                          }
                        }}
                      >
                        <ShoppingCart size={13} />
                        Draft Proposal
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
