import React, { useState } from 'react';
import { Building2, PieChart, Layers } from 'lucide-react';
import type { BranchSalesComparison, CategorySalesShare } from '../../types/sales';

interface BranchCategoryInsightsProps {
  branches: BranchSalesComparison[];
  categories: CategorySalesShare[];
}

export const BranchCategoryInsights: React.FC<BranchCategoryInsightsProps> = ({
  branches = [],
  categories = []
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'categories'>('branches');

  // Fallback demo data if empty
  const defaultBranches: BranchSalesComparison[] = [
    { branchId: '1', branchName: 'Colombo Central Branch', revenue: 14820.50, unitsSold: 580, orderCount: 110, percentageOfTotal: 62.5 },
    { branchId: '2', branchName: 'Kandy City Branch', revenue: 8910.00, unitsSold: 340, orderCount: 70, percentageOfTotal: 37.5 },
  ];

  const defaultCategories: CategorySalesShare[] = [
    { category: 'Pharmaceuticals', unitsSold: 460, revenue: 11200.0, percentage: 47.2 },
    { category: 'Antibiotics', unitsSold: 220, revenue: 6450.0, percentage: 27.2 },
    { category: 'Supplements', unitsSold: 140, revenue: 4100.0, percentage: 17.3 },
    { category: 'Medical Supplies', unitsSold: 100, revenue: 1980.5, percentage: 8.3 },
  ];

  const branchList = branches.length > 0 ? branches : defaultBranches;
  const categoryList = categories.length > 0 ? categories : defaultCategories;

  const totalBranchRevenue = branchList.reduce((acc, b) => acc + b.revenue, 0);

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
            <Building2 size={16} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Branch & Category Insights
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Geographic Distribution & Product Portfolios
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
            onClick={() => setActiveTab('branches')}
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
              background: activeTab === 'branches' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'branches' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Building2 size={13} />
            <span>Branches</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
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
              background: activeTab === 'categories' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'categories' ? '#FFFFFF' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <PieChart size={13} />
            <span>Categories</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'branches' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          {branchList.map((branch, idx) => {
            const pct = totalBranchRevenue > 0
              ? Math.round((branch.revenue / totalBranchRevenue) * 100)
              : branch.percentageOfTotal;

            return (
              <div
                key={branch.branchId || branch.branchName || idx}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: idx === 0 ? '#0068FF' : '#059669'
                    }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {branch.branchName}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ${branch.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Progress bar */}
                <div style={{
                  width: '100%',
                  height: 6,
                  backgroundColor: '#E2E8F0',
                  borderRadius: 3,
                  overflow: 'hidden',
                  marginBottom: 8
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    backgroundColor: idx === 0 ? '#0068FF' : '#059669',
                    borderRadius: 3,
                    transition: 'width 0.4s ease'
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>{branch.unitsSold} units sold &bull; {branch.orderCount} orders</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{pct}% of Total Revenue</strong>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Categories Breakdown */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {categoryList.map((cat, idx) => {
            const colors = ['#0068FF', '#10B981', '#F59E0B', '#8B5CF6'];
            const color = colors[idx % colors.length];

            return (
              <div
                key={cat.category || idx}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} color={color} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cat.category}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ${cat.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div style={{
                  width: '100%',
                  height: 5,
                  backgroundColor: '#E2E8F0',
                  borderRadius: 3,
                  overflow: 'hidden',
                  margin: '6px 0'
                }}>
                  <div style={{
                    width: `${cat.percentage}%`,
                    height: '100%',
                    backgroundColor: color,
                    borderRadius: 3
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>{cat.unitsSold || 0} units</span>
                  <span>{cat.percentage.toFixed(1)}% market share</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
