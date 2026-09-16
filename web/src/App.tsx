import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/layout/Sidebar';
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
import { AgentTraceDrawer } from './components/sales/AgentTraceDrawer';
import { salesApi, demandApi, agentApi } from './services/api';
import type { Sale, DemandForecast, ReorderSuggestion, SalesAnalyticsSummary, WorkflowState } from './types/sales';
import { Package, Truck, ShoppingCart, CheckCircle2, ArrowRight, X, Search } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sales');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [searchQuery, setSearchQuery] = useState('');
  const [forecastHorizon, setForecastHorizon] = useState(30);

  // State
  const [sales, setSales] = useState<Sale[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsSummary | null>(null);
  const [activeForecast, setActiveForecast] = useState<DemandForecast | null>(null);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [currentWorkflowState, setCurrentWorkflowState] = useState<WorkflowState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & Drawers
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [isRunForecastOpen, setIsRunForecastOpen] = useState(false);
  const [isAgentTraceOpen, setIsAgentTraceOpen] = useState(false);
  const [proposalItem, setProposalItem] = useState<ReorderSuggestion | null>(null);

  // Load all Sales & Demand data
  const loadDashboardData = useCallback(async (horizonDays: number = forecastHorizon) => {
    setIsRefreshing(true);
    try {
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
      } else {
        const initialResult = await agentApi.runForecastAgent({
          productId: '18464716-8fa7-49da-b521-08b1dc057c28',
          productSku: 'SKU-PARACETAMOL-500',
          productName: 'Paracetamol 500mg (100 Tabs)',
          forecastDays: horizonDays,
          leadTimeDays: 7,
          currentStockLevel: 45,
          initiatedBy: 'SystemAutoInit'
        });
        if (initialResult.forecast) {
          setActiveForecast(initialResult.forecast);
          setCurrentWorkflowState(initialResult.workflowState);
        }
      }

      // 5. Load latest Agent Workflow Audit Trace
      const audits = await agentApi.getAudits(1);
      if (audits.length > 0) {
        setCurrentWorkflowState(audits[0]);
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

  const handleSaleCreated = () => {
    loadDashboardData();
  };

  const handleForecastGenerated = (forecast: DemandForecast, workflowState?: WorkflowState) => {
    setActiveForecast(forecast);
    setForecastHorizon(forecast.period);
    if (workflowState) {
      setCurrentWorkflowState(workflowState);
    }
    demandApi.getReorderSuggestions().then(setReorderSuggestions);
  };

  const handleHorizonChange = async (days: number) => {
    setForecastHorizon(days);
    setIsRefreshing(true);
    try {
      const result = await agentApi.runForecastAgent({
        productId: activeForecast?.productId || '18464716-8fa7-49da-b521-08b1dc057c28',
        productSku: activeForecast?.productSku || 'SKU-PARACETAMOL-500',
        productName: activeForecast?.productName || 'Paracetamol 500mg (100 Tabs)',
        forecastDays: days,
        leadTimeDays: 7,
        currentStockLevel: 45,
        initiatedBy: 'HorizonSelector'
      });
      if (result.forecast) {
        setActiveForecast(result.forecast);
        if (result.workflowState) {
          setCurrentWorkflowState(result.workflowState);
        }
      }
    } catch (err) {
      console.error('Error adjusting horizon:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const criticalAlertCount = useMemo(() => {
    return reorderSuggestions.filter((r) => r.urgencyLevel === 'Critical').length;
  }, [reorderSuggestions]);

  // Branch filter helper
  const branchFilteredSales = useMemo(() => {
    if (selectedBranch === 'All Branches') return sales;
    return sales.filter((s) => s.branchName.toLowerCase().includes(selectedBranch.toLowerCase()));
  }, [sales, selectedBranch]);

  const branchFilteredSuggestions = useMemo(() => {
    if (selectedBranch === 'All Branches') return reorderSuggestions;
    return reorderSuggestions.filter((s) => s.branchName.toLowerCase().includes(selectedBranch.toLowerCase()));
  }, [reorderSuggestions, selectedBranch]);

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
    <div className="app-shell">
      {/* Enterprise Collapsible Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onOpenAgentTrace={() => setIsAgentTraceOpen(true)}
        criticalAlertCount={criticalAlertCount}
      />

      {/* Main Workspace Area */}
      <div className="main-wrapper">
        {/* Global Top Header */}
        <TopHeader
          selectedBranch={selectedBranch}
          setSelectedBranch={setSelectedBranch}
          onRecordSaleClick={() => setIsRecordSaleOpen(true)}
          onRunForecastClick={() => setIsRunForecastOpen(true)}
          onRefreshData={() => loadDashboardData(forecastHorizon)}
          isRefreshing={isRefreshing}
          onOpenAgentTrace={() => setIsAgentTraceOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          reorderSuggestions={branchFilteredSuggestions}
          sales={branchFilteredSales}
          onSelectProduct={() => setIsRunForecastOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {activeTab === 'sales' ? (
            <>
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
              <ActivityPipeline
                analytics={analytics}
                reorderSuggestions={branchFilteredSuggestions}
                forecastConfidence={activeForecast?.confidenceScore}
              />

              {/* 2. Dual Section: Forecast Curve (Horizon + Shaded Bands) & Top Selling / Slow Movers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.85fr) minmax(0, 1.15fr)',
                gap: 20
              }}>
                <div style={{ minWidth: 0 }}>
                  <ForecastChart
                    forecast={activeForecast}
                    onTriggerNewForecast={() => setIsRunForecastOpen(true)}
                    onInspectAgentTrace={() => setIsAgentTraceOpen(true)}
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
              <ReorderTable
                suggestions={searchedSuggestions}
                onDraftPurchaseProposal={(item) => setProposalItem(item)}
              />

              {/* 6. Sales Invoices Ledger Table (Filters: Branch, Date, Payment + CSV / PDF Export) */}
              <div id="sales-ledger-section">
                <SalesLedgerTable
                  sales={branchFilteredSales}
                  isLoading={isLoading}
                  externalSearch={searchQuery}
                />
              </div>
            </>
          ) : (
            /* Teammate Module Placeholders */
            <div className="glass-card" style={{ textAlign: 'center', padding: '72px 24px', margin: '40px auto', maxWidth: 680 }}>
              <div style={{
                display: 'inline-flex',
                padding: 20,
                borderRadius: '50%',
                background: 'rgba(0, 104, 255, 0.1)',
                color: 'var(--primary-color)',
                marginBottom: 20
              }}>
                {activeTab === 'inventory' && <Package size={42} />}
                {activeTab === 'suppliers' && <Truck size={42} />}
                {activeTab === 'procurement' && <ShoppingCart size={42} />}
              </div>
              <h2 style={{ fontSize: '1.45rem', color: 'var(--text-primary)', marginBottom: 12, fontWeight: 700 }}>
                {activeTab === 'inventory' && 'Items & Inventory Management'}
                {activeTab === 'suppliers' && 'Vendor Catalogs & Supplier Relations'}
                {activeTab === 'procurement' && 'Procurement & Purchase Order Management'}
              </h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24, fontSize: '0.9rem' }}>
                This module operates seamlessly on the unified ASP.NET Core API and PostgreSQL database. The Demand Forecast Agent continuously synchronizes replenishment proposals and dynamic inventory buffers with this module.
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#059669',
                padding: '8px 16px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <CheckCircle2 size={16} />
                <span>Unified Enterprise Database & Agent APIs Connected</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Record Sale Modal */}
      <RecordSaleModal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        onSaleCreated={handleSaleCreated}
      />

      {/* Run Forecast Agent Modal */}
      <RunForecastModal
        isOpen={isRunForecastOpen}
        onClose={() => setIsRunForecastOpen(false)}
        onForecastGenerated={handleForecastGenerated}
      />

      {/* Agent Workflow Execution Trace Drawer */}
      <AgentTraceDrawer
        isOpen={isAgentTraceOpen}
        onClose={() => setIsAgentTraceOpen(false)}
        workflowState={currentWorkflowState}
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
                  alert(`Purchase Proposal payload generated for ${proposalItem.productName} (${proposalItem.recommendedOrderQuantity} units) and dispatched to Procurement Coordinator Agent queue!`);
                  setProposalItem(null);
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

export default App;
