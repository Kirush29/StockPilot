import React from 'react';
import {
  Package,
  TrendingUp,
  Truck,
  ShoppingCart,
  Bot,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Receipt,
  Boxes,
  Shield
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenAgentTrace: () => void;
  criticalAlertCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  onOpenAgentTrace,
  criticalAlertCount
}) => {
  const navItems = [
    { id: 'sales', label: 'Sales & Demand', icon: TrendingUp },
    { id: 'inventory', label: 'Items & Inventory', icon: Package },
    { id: 'procurement', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'suppliers', label: 'Vendor Catalogs', icon: Truck },
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header / Brand */}
      <div style={{
        padding: isCollapsed ? '16px 8px' : '18px 20px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        height: 68
      }}>
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: 'linear-gradient(135deg, #0066FF 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(0, 102, 255, 0.25)'
            }}>
              <Boxes size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  StockPilot
                </span>
                <span style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  backgroundColor: '#EFF6FF',
                  color: 'var(--primary-color)',
                  padding: '2px 6px',
                  borderRadius: 6,
                  border: '1px solid #DBEAFE'
                }}>
                  AI Core
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                Inventory Intelligence
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.15s'
          }}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Main Navigation Items */}
      <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!isCollapsed && (
          <div style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            padding: '4px 10px 8px 10px',
            letterSpacing: '0.06em'
          }}>
            Main Menu
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                padding: isCollapsed ? '11px 0' : '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: isActive
                  ? '#EFF6FF'
                  : 'transparent',
                borderLeft: isActive ? '3px solid var(--primary-color)' : '3px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: 'none',
                color: isActive ? 'var(--primary-color)' : 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Icon size={18} color={isActive ? 'var(--primary-color)' : '#64748B'} />
                {!isCollapsed && (
                  <span style={{ fontSize: '0.86rem', fontWeight: isActive ? 700 : 500 }}>
                    {item.label}
                  </span>
                )}
              </div>
            </button>
          );
        })}

        {/* Sub-navigation for Sales & Demand when active */}
        {activeTab === 'sales' && !isCollapsed && (
          <div style={{
            margin: '8px 0 12px 14px',
            paddingLeft: 12,
            borderLeft: '2px solid #E2E8F0',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--primary-color)', fontWeight: 600, padding: '4px 6px' }}>
              <Sparkles size={13} color="var(--primary-color)" />
              <span>Forecast Engine</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)', padding: '4px 6px' }}>
              <AlertTriangle size={13} color="#D97706" />
              <span>ROP Alerts</span>
              {criticalAlertCount > 0 && (
                <span style={{
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  fontSize: '0.65rem',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 700
                }}>
                  {criticalAlertCount}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: 'var(--text-muted)', padding: '4px 6px' }}>
              <Receipt size={13} color="#64748B" />
              <span>Sales Ledger</span>
            </div>
          </div>
        )}

        <div style={{ height: 1, backgroundColor: 'var(--border-subtle)', margin: '12px 0' }} />

        {/* AI Agent Center Quick Action */}
        <button
          onClick={onOpenAgentTrace}
          title={isCollapsed ? 'Agent Execution Trace' : undefined}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: 10,
            padding: isCollapsed ? '10px 0' : '10px 12px',
            borderRadius: 'var(--radius-sm)',
            background: '#F5F3FF',
            border: '1px solid #DDD6FE',
            color: '#6D28D9',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Bot size={18} color="#7C3AED" />
          {!isCollapsed && (
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#5B21B6' }}>Agentic Trace</div>
              <div style={{ fontSize: '0.68rem', color: '#7C3AED' }}>Auditable Workflow State</div>
            </div>
          )}
        </button>
      </div>

      {/* Sidebar Footer: Modern User Profile */}
      <div style={{
        padding: isCollapsed ? '12px 6px' : '14px 16px',
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: '#F8FAFC'
      }}>
        {!isCollapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #0066FF 0%, #3B82F6 100%)',
                border: '2px solid #FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                color: '#FFFFFF',
                boxShadow: '0 2px 6px rgba(0, 102, 255, 0.2)'
              }}>
                <Shield size={16} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Operations Lead
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div className="pulse-dot" style={{ width: 6, height: 6 }} />
                  <span>Enterprise Active</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div className="pulse-dot" style={{ width: 8, height: 8 }} />
          </div>
        )}
      </div>
    </aside>
  );
};
