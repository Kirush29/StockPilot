import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { KpiCards } from './components/sales/KpiCards';
import { ForecastChart } from './components/sales/ForecastChart';
import { ReorderTable } from './components/sales/ReorderTable';
import { SalesLedgerTable } from './components/sales/SalesLedgerTable';
import { RecordSaleModal } from './components/sales/RecordSaleModal';
import { RunForecastModal } from './components/sales/RunForecastModal';
import { salesApi, demandApi } from './services/api';
import type { Sale, DemandForecast, ReorderSuggestion, SalesAnalyticsSummary } from './types/sales';
import { Package, Truck, ShoppingCart, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sales');

  // State
  const [sales, setSales] = useState<Sale[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsSummary | null>(null);
  const [activeForecast, setActiveForecast] = useState<DemandForecast | null>(null);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [isRunForecastOpen, setIsRunForecastOpen] = useState(false);

  // Load all Sales & Demand data
  const loadDashboardData = useCallback(async () => {
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

      // 4. Load Forecast History or generate initial baseline if none exists
      const forecastHistory = await demandApi.getForecastHistory();
      if (forecastHistory.length > 0) {
        setActiveForecast(forecastHistory[0]);
      } else {
        // Auto-generate initial baseline forecast for primary product
        const initialForecast = await demandApi.generateForecast({
          productId: '18464716-8fa7-49da-b521-08b1dc057c28',
          productSku: 'SKU-PARACETAMOL-500',
          productName: 'Paracetamol 500mg (100 Tabs)',
          period: 30,
          leadTimeDays: 7,
          currentStockLevel: 45
        });
        setActiveForecast(initialForecast);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSaleCreated = () => {
    loadDashboardData();
  };

  const handleForecastGenerated = (forecast: DemandForecast) => {
    setActiveForecast(forecast);
    demandApi.getReorderSuggestions().then(setReorderSuggestions);
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRecordSaleClick={() => setIsRecordSaleOpen(true)}
        onRunForecastClick={() => setIsRunForecastOpen(true)}
        onRefreshData={loadDashboardData}
        isRefreshing={isRefreshing}
      />

      {/* Main Container */}
      <main className="main-content">
        {activeTab === 'sales' ? (
          <div>
            {/* Page Header */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              marginBottom: 28
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#FFF', margin: 0 }}>
                    Sales & Demand Analytics
                  </h1>
                  <span className="badge badge-emerald">
                    Component Live
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Real-time sales tracking, AI demand projection curves, and deterministic Reorder Point (ROP) engine.
                </p>
              </div>

              {/* Status Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-lg)',
                fontSize: '0.8rem',
                color: '#34D399'
              }}>
                <div className="pulse-dot" />
                <span>Backend API: <strong>http://localhost:5004</strong> (Connected)</span>
              </div>
            </div>

            {/* KPI Overview Cards */}
            <KpiCards
              analytics={analytics}
              forecastConfidence={activeForecast?.confidenceScore}
            />

            {/* Interactive Demand Forecast Curve Chart (Recharts) */}
            <ForecastChart
              forecast={activeForecast}
              onTriggerNewForecast={() => setIsRunForecastOpen(true)}
            />

            {/* Reorder Suggestions (ROP) Table */}
            <ReorderTable
              suggestions={reorderSuggestions}
              onDraftPurchaseProposal={(item) => {
                alert(`Generated purchase requirement for ${item.productName} (${item.recommendedOrderQuantity} units) to feed into Procurement Coordinator Agent!`);
              }}
            />

            {/* Sales Transaction Ledger */}
            <SalesLedgerTable
              sales={sales}
              isLoading={isLoading}
            />
          </div>
        ) : (
          /* Teammate Placeholders */
          <div className="glass-card" style={{ textAlign: 'center', padding: '64px 24px', margin: '40px auto', maxWidth: 700 }}>
            <div style={{
              display: 'inline-flex',
              padding: 20,
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#818CF8',
              marginBottom: 20
            }}>
              {activeTab === 'inventory' && <Package size={40} />}
              {activeTab === 'suppliers' && <Truck size={40} />}
              {activeTab === 'procurement' && <ShoppingCart size={40} />}
            </div>
            <h2 style={{ fontSize: '1.5rem', color: '#FFF', marginBottom: 12 }}>
              {activeTab === 'inventory' && 'Inventory Management Module (Student 1)'}
              {activeTab === 'suppliers' && 'Supplier Management Module (Student 3)'}
              {activeTab === 'procurement' && 'Procurement Management Module (Student 4)'}
            </h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
              This tab is reserved for your teammate's component. Thanks to our Clean Architecture structure, they can plug in their React views and ASP.NET Core controllers with <strong>zero merge conflicts</strong>.
            </p>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34D399',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem'
            }}>
              <CheckCircle2 size={16} />
              <span>Your Sales & Demand module is ready for teammate data binding</span>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <RecordSaleModal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        onSaleCreated={handleSaleCreated}
      />

      <RunForecastModal
        isOpen={isRunForecastOpen}
        onClose={() => setIsRunForecastOpen(false)}
        onForecastGenerated={handleForecastGenerated}
      />
    </div>
  );
};

export default App;
