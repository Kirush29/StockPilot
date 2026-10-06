import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TopHeader } from './components/layout/TopHeader';
import { ActivityPipeline } from './components/sales/ActivityPipeline';
import { ForecastChart } from './components/sales/ForecastChart';
import { TopSellingWidget } from './components/sales/TopSellingWidget';
import { DemandTrendsWidget } from './components/sales/DemandTrendsWidget';
import { BranchCategoryInsights } from './components/sales/BranchCategoryInsights';
import { CustomerBehaviorWidget } from './components/sales/CustomerBehaviorWidget';
import { ReorderTable } from './components/sales/ReorderTable';
import { SalesLedgerTable } from './components/sales/SalesLedgerTable';
import { RecordSaleModal } from './components/sales/RecordSaleModal';
import { RunForecastModal } from './components/sales/RunForecastModal';
import { salesApi, demandApi, agentApi, branchApi, productApi } from './services/api';
import type { Sale, DemandForecast, ReorderSuggestion, SalesAnalyticsSummary, BranchOption, ProductOption } from './types/sales';
import { ShoppingCart, ArrowRight, X, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './sales.css';

// Sales & Demand dashboard (Student 2), ported from the module's standalone App.tsx into the shell.
// Integration changes: the module's own sidebar/tab chrome is removed (the shell provides navigation), and
// "Dispatch to Procurement Agent" opens the Replenishment orchestrator instead of an alert() stub.

export const SalesDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [searchQuery, setSearchQuery] = useState('');
  const [forecastHorizon, setForecastHorizon] = useState(30);

  // State
  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsSummary | null>(null);
  const [activeForecast, setActiveForecast] = useState<DemandForecast | null>(null);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & Drawers
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [isRunForecastOpen, setIsRunForecastOpen] = useState(false);
  const [proposalItem, setProposalItem] = useState<ReorderSuggestion | null>(null);

  // Load all Sales & Demand data
  const loadDashboardData = useCallback(async (horizonDays: number = forecastHorizon) => {
    setIsRefreshing(true);
    try {
      // 0. Load Branches and Products
      const [branchList, productList] = await Promise.all([
        branchApi.getBranches(),
        productApi.getProducts()
      ]);
      setAvailableBranches(branchList);
      setAvailableProducts(productList);

      // 1. Load Sales
      const salesData = await salesApi.getSales();
      setSales(salesData);

      // 2. Load Analytics Summary
      const analyticsData = await salesApi.getAnalytics(undefined, 30);
      setAnalytics(analyticsData);

      // 3. Load Reorder Suggestions
      const suggestions = await demandApi.getReorderSuggestions();
      setReorderSuggestions(suggestions);

      // 4. Load Forecast History or execute initial baseline
      const forecastHistory = await demandApi.getForecastHistory();
      if (forecastHistory.length > 0 && forecastHistory[0].period === horizonDays) {
        setActiveForecast(forecastHistory[0]);
      } else if (forecastHistory.length > 0) {
        setActiveForecast(forecastHistory[0]);
      } else if (productList.length > 0) {
        try {
          const firstProduct = productList[0];
          const initialResult = await agentApi.runForecastAgent({
            productId: firstProduct.productId,
            productSku: firstProduct.sku,
            productName: firstProduct.name,
            forecastDays: horizonDays,
            leadTimeDays: 7,
            currentStockLevel: 0,
            initiatedBy: 'SystemAutoInit'
          });
          if (initialResult.forecast) {
            setActiveForecast(initialResult.forecast);
          }
        } catch {
          setActiveForecast(null);
        }
      } else {
        setActiveForecast(null);
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [forecastHorizon]);

  useEffect(() => {
    loadDashboardData(forecastHorizon);
  }, [loadDashboardData, forecastHorizon]);

  // Sales & Demand sidebar sub-navigation keeps one dashboard while deep-linking
  // to the relevant section. This avoids duplicating data-fetching logic across pages.
  useEffect(() => {
    const sectionByPath: Record<string, string> = {
      '/sales': 'sales-overview-section',
      '/sales/forecast': 'sales-forecast-section',
      '/sales/reorder': 'sales-reorder-section',
      '/sales/records': 'sales-ledger-section',
    };

    const sectionId = sectionByPath[pathname];
    if (!sectionId) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  const handleSaleCreated = () => {
    loadDashboardData();
  };

  const handleForecastGenerated = (forecast: DemandForecast) => {
    setActiveForecast(forecast);
    setForecastHorizon(forecast.period);
    demandApi.getReorderSuggestions().then(setReorderSuggestions);
  };

  const handleHorizonChange = async (days: number) => {
    setForecastHorizon(days);
    setIsRefreshing(true);
    try {
      const targetProduct = activeForecast
        ? { productId: activeForecast.productId, sku: activeForecast.productSku, name: activeForecast.productName }
        : availableProducts[0];
      if (!targetProduct) {
        setIsRefreshing(false);
        return;
      }

      const result = await agentApi.runForecastAgent({
        productId: targetProduct.productId,
        productSku: targetProduct.sku,
        productName: targetProduct.name,
        forecastDays: days,
        leadTimeDays: 7,
        currentStockLevel: 0,
        initiatedBy: 'HorizonSelector'
      });
      if (result.forecast) {
        setActiveForecast(result.forecast);
      }
    } catch (err) {
      console.error('Error adjusting horizon:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const selectedBranchObj = useMemo(() => {
    if (selectedBranch === 'All Branches') return null;
    return availableBranches.find((b) => b.name === selectedBranch || b.branchId === selectedBranch) || null;
  }, [selectedBranch, availableBranches]);

  // Branch filter helper
  const branchFilteredSales = useMemo(() => {
    if (selectedBranch === 'All Branches') return sales;
    return sales.filter((s) =>
      (selectedBranchObj && s.branchId === selectedBranchObj.branchId) ||
      s.branchName.toLowerCase().includes(selectedBranch.toLowerCase())
    );
  }, [sales, selectedBranch, selectedBranchObj]);

  const branchFilteredSuggestions = useMemo(() => {
    if (selectedBranch === 'All Branches') return reorderSuggestions;
    return reorderSuggestions.filter((s) =>
      (selectedBranchObj && s.branchId === selectedBranchObj.branchId) ||
      s.branchName.toLowerCase().includes(selectedBranch.toLowerCase())
    );
  }, [reorderSuggestions, selectedBranch, selectedBranchObj]);

  // Search filtered suggestions
  const searchedSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return branchFilteredSuggestions;
    const q = searchQuery.toLowerCase().trim();
    return branchFilteredSuggestions.filter(
      (s) =>
        s.productName.toLowerCase().includes(q) ||
        s.productSku.toLowerCase().includes(q) ||
        s.branchName.toLowerCase().includes(q)
    );
  }, [branchFilteredSuggestions, searchQuery]);

  return (
    <div className="sales-module">
        <TopHeader
          branches={availableBranches}
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          onRecordSaleClick={() => setIsRecordSaleOpen(true)}
          onRunForecastClick={() => setIsRunForecastOpen(true)}
          onRefreshData={() => loadDashboardData(forecastHorizon)}
          isRefreshing={isRefreshing}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          reorderSuggestions={branchFilteredSuggestions}
          sales={branchFilteredSales}
          onSelectProduct={() => setIsRunForecastOpen(true)}
        />

              {/* Active Search Notification Banner */}
              {searchQuery.trim() && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--primary-color)',
                  fontSize: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Search size={16} />
                    <span>
                      Filtered by "<strong>{searchQuery}</strong>" — Showing {searchedSuggestions.length} items in Reorder Alerts and matching invoices below.
                    </span>
                  </div>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    Clear Search
                  </button>
                </div>
              )}

              {/* 1. Sales Activity Pipeline & Stock Counters */}
              <div id="sales-overview-section" className="sales-scroll-section">
              <ActivityPipeline
                analytics={analytics}
                reorderSuggestions={branchFilteredSuggestions}
                forecastConfidence={activeForecast?.confidenceScore}
              />
              </div>

              {/* 2. Dual Section: Forecast Curve (Horizon + Shaded Bands) & Top Selling / Slow Movers */}
              <div id="sales-forecast-section" className="sales-scroll-section" style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.85fr) minmax(0, 1.15fr)',
                gap: 20
              }}>
                <div style={{ minWidth: 0 }}>
                  <ForecastChart
                    forecast={activeForecast}
                    onTriggerNewForecast={() => setIsRunForecastOpen(true)}
                    selectedHorizon={forecastHorizon}
                    onHorizonChange={handleHorizonChange}
                  />
                </div>

                <div style={{ minWidth: 0 }}>
                  <TopSellingWidget
                    products={analytics?.topSellingProducts || []}
                    slowMovers={analytics?.slowMovingProducts || []}
                  />
                </div>
              </div>

              {/* 3. Demand Trends & Branch/Category Insights Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                gap: 20
              }}>
                <div style={{ minWidth: 0 }}>
                  <DemandTrendsWidget
                    dailyTrends={analytics?.dailyTrends || []}
                    dayOfWeekPatterns={analytics?.dayOfWeekPatterns || []}
                  />
                </div>

                <div style={{ minWidth: 0 }}>
                  <BranchCategoryInsights
                    branches={analytics?.branchComparisons || []}
                    categories={analytics?.categoryShares || []}
                    allBranches={availableBranches}
                  />
                </div>
              </div>

              {/* 4. Customer Behavior Widget (Top 5 Customers & Products Frequently Bought Together) */}
              <div>
                <CustomerBehaviorWidget
                  behavior={analytics?.customerBehavior || null}
                />
              </div>

              {/* 5. Reorder Point & Replenishment Alerts Table */}
              <div id="sales-reorder-section" className="sales-scroll-section">
              <ReorderTable
                suggestions={searchedSuggestions}
                onDraftPurchaseProposal={(item) => setProposalItem(item)}
              />
              </div>

              {/* 6. Sales Invoices Ledger Table (Filters: Branch, Date, Payment + CSV / PDF Export) */}
              <div id="sales-ledger-section" className="sales-scroll-section">
                <SalesLedgerTable
                  sales={branchFilteredSales}
                  isLoading={isLoading}
                  externalSearch={searchQuery}
                  branches={availableBranches}
                />
              </div>

      {/* Record Sale Modal */}
      <RecordSaleModal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        onSaleCreated={handleSaleCreated}
        branches={availableBranches}
        products={availableProducts}
      />

      {/* Run Forecast Agent Modal */}
      <RunForecastModal
        isOpen={isRunForecastOpen}
        onClose={() => setIsRunForecastOpen(false)}
        onForecastGenerated={handleForecastGenerated}
        branches={availableBranches}
        products={availableProducts}
      />


      {/* Purchase Proposal Handoff Modal (Architecture Rule 3 & 4) */}
      {proposalItem && (
        <div className="modal-overlay" onClick={() => setProposalItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: 8, borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.15)', color: '#D97706' }}>
                  <ShoppingCart size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Draft Purchase Proposal</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                    Handoff: Demand Forecast Agent &rarr; Procurement Coordinator Agent
                  </p>
                </div>
              </div>
              <button onClick={() => setProposalItem(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 14, marginBottom: 18, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: '0.85rem' }}>
                <div>Product: <strong style={{ color: 'var(--text-primary)' }}>{proposalItem.productName}</strong></div>
                <div>SKU: <code style={{ color: 'var(--primary-color)' }}>{proposalItem.productSku}</code></div>
                <div>Branch: <strong style={{ color: 'var(--text-primary)' }}>{proposalItem.branchName}</strong></div>
                <div>Current Stock: <strong style={{ color: '#DC2626' }}>{proposalItem.currentStock} units</strong></div>
                <div>Reorder Point: <strong style={{ color: '#D97706' }}>{proposalItem.reorderPoint} units</strong></div>
                <div>Suggested Order Qty: <strong style={{ color: '#059669' }}>{proposalItem.recommendedOrderQuantity} units</strong></div>
              </div>
            </div>

            <div style={{
              padding: 12,
              borderRadius: 6,
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              fontSize: '0.8rem',
              color: '#1E40AF',
              marginBottom: 20
            }}>
              <strong>Architecture Rule 3 & 4:</strong> AI agents create structured <em>purchase proposals</em>. Confirmed Purchase Order creation strictly requires human approval from an authorized Procurement Officer.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setProposalItem(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  // Integration: hand off to the multi-agent Replenishment orchestrator, which runs Inventory
                  // Optimization -> Demand Forecast -> Supplier Evaluation -> Procurement Coordinator and stops
                  // for human approval (Architecture Rules 3 & 4).
                  const query = new URLSearchParams({ branchId: proposalItem.branchId, productId: proposalItem.productId });
                  setProposalItem(null);
                  navigate(`/procurement/replenishment?${query}`);
                }}
              >
                <span>Dispatch to Procurement Agent</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesDashboardPage;
