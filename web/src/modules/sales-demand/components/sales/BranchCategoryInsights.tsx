import React, { useState, useMemo } from 'react';
import { Building2, PieChart, Layers } from 'lucide-react';
import type { BranchSalesComparison, CategorySalesShare, BranchOption, CategoryOption } from '../../types/sales';

interface BranchCategoryInsightsProps {
  branches: BranchSalesComparison[];
  categories: CategorySalesShare[];
  allBranches?: BranchOption[];
  allCategories?: CategoryOption[];
}

export const BranchCategoryInsights: React.FC<BranchCategoryInsightsProps> = ({
  branches = [],
  categories = [],
  allBranches = [],
  allCategories = []
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'categories'>('branches');

  const branchList = useMemo(() => {
    if (allBranches && allBranches.length > 0) {
      return allBranches.map((ab) => {
        const found = branches.find(
          (b) => b.branchId === ab.branchId || (b.branchName && b.branchName.toLowerCase() === ab.name.toLowerCase())
        );
        if (found) {
          return {
            ...found,
            branchName: ab.name,
          };
        }
        return {
          branchId: ab.branchId,
          branchName: ab.name,
          revenue: 0,
          unitsSold: 0,
          orderCount: 0,
          percentageOfTotal: 0
        };
      });
    }
    return branches || [];
  }, [allBranches, branches]);

  const categoryList = useMemo(() => {
    // /api/categories is the source of truth for which categories exist. Analytics
    // contributes revenue/units only when its category name exactly matches a
    // current category. Historical/free-text analytics labels are intentionally
    // not rendered as new categories.
    if (allCategories && allCategories.length > 0) {
      const analyticsByName = new Map(
        categories.map((category) => [category.category.trim().toLowerCase(), category] as const),
      );

      return allCategories
        .filter((category) => category.isActive !== false)
        .map((category) => {
          const analytics = analyticsByName.get(category.name.trim().toLowerCase());
          return {
            categoryId: category.categoryId,
            category: category.name,
            revenue: analytics?.revenue ?? 0,
            unitsSold: analytics?.unitsSold ?? 0,
            percentage: analytics?.percentage ?? 0,
          };
        })
        .sort((a, b) => b.revenue - a.revenue || a.category.localeCompare(b.category));
    }

    return categories || [];
  }, [allCategories, categories]);

  const unmatchedAnalyticsCategories = useMemo(() => {
    if (!allCategories || allCategories.length === 0) return [];
    const masterNames = new Set(allCategories.map((category) => category.name.trim().toLowerCase()));
    return categories.filter((category) => !masterNames.has(category.category.trim().toLowerCase()));
  }, [allCategories, categories]);

  const totalBranchRevenue = branchList.reduce((acc, b) => acc + (b.revenue || 0), 0);

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
        branchList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
            <Building2 size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>No Branch Sales Recorded</div>
            <p style={{ fontSize: '0.78rem', marginTop: 4, margin: '4px 0 0' }}>Sales comparison across branch locations will appear once branch sales are logged.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
            {branchList.map((branch, idx) => {
              const branchColors = ['#0068FF', '#059669', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
              const branchColor = branchColors[idx % branchColors.length];
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
                        backgroundColor: branchColor
                      }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {branch.branchName}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      Rs. {branch.revenue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      backgroundColor: branchColor,
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
        )
      ) : (
        /* Categories Breakdown */
        categoryList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)' }}>
            <Layers size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>No Category Sales Data</div>
            <p style={{ fontSize: '0.78rem', marginTop: 4, margin: '4px 0 0' }}>Revenue contribution by product category will be visualized here as products are sold.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            {categoryList.map((cat, idx) => {
              const colors = ['#0068FF', '#10B981', '#F59E0B', '#8B5CF6'];
              const color = colors[idx % colors.length];

              return (
                <div
                  key={'categoryId' in cat && cat.categoryId ? cat.categoryId : cat.category || idx}
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
                        Rs. {cat.revenue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            {unmatchedAnalyticsCategories.length > 0 && (
              <div
                role="note"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FED7AA',
                  color: '#9A3412',
                  fontSize: '0.7rem',
                  lineHeight: 1.45,
                }}
              >
                {unmatchedAnalyticsCategories.length} historical sales categor{unmatchedAnalyticsCategories.length === 1 ? 'y is' : 'ies are'} not in the current category master list and {unmatchedAnalyticsCategories.length === 1 ? 'is' : 'are'} excluded from this view.
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};
