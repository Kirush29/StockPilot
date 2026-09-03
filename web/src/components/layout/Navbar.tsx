import React from 'react';
import { 
  TrendingUp, 
  Package, 
  Truck, 
  ShoppingCart, 
  Sparkles, 
  PlusCircle, 
  RefreshCw 
} from 'lucide-react';

interface NavbarProps {
  onRecordSaleClick: () => void;
  onRunForecastClick: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRecordSaleClick,
  onRunForecastClick,
  onRefreshData,
  isRefreshing,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 32px'
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        height: 72,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left: Branding & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 42,
            height: 42,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            boxShadow: '0 4px 12px var(--primary-glow)'
          }}>
            <TrendingUp size={24} color="#FFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFF' }}>
                StockPilot
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                Agentic AI v1.0
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Right Stock. Right Supplier. Right Time.
            </p>
          </div>
        </div>

        {/* Center: Module Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(31, 41, 55, 0.4)',
          padding: '4px 6px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => setActiveTab('sales')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'sales' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'sales' ? '#FFF' : 'var(--text-muted)'
            }}
          >
            <TrendingUp size={16} />
            Sales & Demand (Yours)
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'inventory' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'inventory' ? '#FFF' : 'var(--text-muted)',
              opacity: activeTab === 'inventory' ? 1 : 0.6
            }}
          >
            <Package size={16} />
            Inventory
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'suppliers' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'suppliers' ? '#FFF' : 'var(--text-muted)',
              opacity: activeTab === 'suppliers' ? 1 : 0.6
            }}
          >
            <Truck size={16} />
            Suppliers
          </button>

          <button
            onClick={() => setActiveTab('procurement')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: activeTab === 'procurement' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'procurement' ? '#FFF' : 'var(--text-muted)',
              opacity: activeTab === 'procurement' ? 1 : 0.6
            }}
          >
            <ShoppingCart size={16} />
            Procurement
          </button>
        </nav>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={onRefreshData}
            title="Refresh analytics data"
            style={{ padding: '8px 12px' }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'spin-animation' : ''} />
          </button>

          <button
            className="btn btn-secondary"
            onClick={onRunForecastClick}
            style={{
              border: '1px solid rgba(99, 102, 241, 0.4)',
              background: 'rgba(99, 102, 241, 0.1)'
            }}
          >
            <Sparkles size={16} color="#818CF8" />
            Run Demand Agent
          </button>

          <button
            className="btn btn-primary"
            onClick={onRecordSaleClick}
          >
            <PlusCircle size={16} />
            Record Sale
          </button>
        </div>
      </div>
    </header>
  );
};
