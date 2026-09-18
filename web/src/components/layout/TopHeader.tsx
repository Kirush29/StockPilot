import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Building2,
  Plus,
  RefreshCw,
  Sparkles,
  Receipt,
  Bot,
  X,
  Package,
  FileText,
  ArrowRight
} from 'lucide-react';
import type { Sale, ReorderSuggestion } from '../../types/sales';

interface TopHeaderProps {
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  onRecordSaleClick: () => void;
  onRunForecastClick: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  onOpenAgentTrace: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  reorderSuggestions?: ReorderSuggestion[];
  sales?: Sale[];
  onSelectProduct?: (productSku: string, productName: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  selectedBranch,
  setSelectedBranch,
  onRecordSaleClick,
  onRunForecastClick,
  onRefreshData,
  isRefreshing,
  onOpenAgentTrace,
  searchQuery,
  setSearchQuery,
  reorderSuggestions = [],
  sales = [],
  onSelectProduct
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter matching items
  const cleanQuery = searchQuery.trim().toLowerCase();
  
  const matchingSuggestions = cleanQuery
    ? reorderSuggestions
        .filter((s) => s.productName.toLowerCase().includes(cleanQuery) || s.productSku.toLowerCase().includes(cleanQuery))
        .slice(0, 4)
    : [];

  const matchingSales = cleanQuery
    ? sales
        .filter(
          (s) =>
            s.invoiceNumber.toLowerCase().includes(cleanQuery) ||
            (s.customerReference && s.customerReference.toLowerCase().includes(cleanQuery)) ||
            s.items.some((i) => i.productName.toLowerCase().includes(cleanQuery) || i.productSku.toLowerCase().includes(cleanQuery))
        )
        .slice(0, 4)
    : [];

  const totalMatches = matchingSuggestions.length + matchingSales.length;

  return (
    <header className="top-header">
      {/* Left: Branch Location Switcher & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#F8FAFC',
          border: '1px solid var(--border-subtle)',
          padding: '5px 10px',
          borderRadius: 'var(--radius-sm)'
        }}>
          <Building2 size={15} color="var(--primary-color)" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="All Branches">All Branches (Consolidated)</option>
            <option value="Colombo Central Branch">Colombo Central Branch</option>
            <option value="Kandy City Branch">Kandy City Branch</option>
          </select>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Sales & Demand / <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Overview & Agent Analytics</span>
        </div>
      </div>

      {/* Center: Global Omnibar Search Bar */}
      <div
        ref={searchContainerRef}
        style={{
          flex: 1,
          maxWidth: 440,
          margin: '0 24px',
          position: 'relative'
        }}
      >
        <Search
          size={16}
          color={isSearchOpen ? 'var(--primary-color)' : '#64748B'}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}
        />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search SKUs, items, invoices, customers..."
          value={searchQuery}
          onFocus={() => setIsSearchOpen(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          style={{
            width: '100%',
            padding: '8px 65px 8px 36px',
            borderRadius: 'var(--radius-sm)',
            background: '#FFFFFF',
            border: isSearchOpen ? '1px solid var(--primary-color)' : '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            outline: 'none',
            boxShadow: isSearchOpen ? '0 0 0 2px rgba(0, 104, 255, 0.15)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s'
          }}
        />

        {/* Right buttons inside search input */}
        <div style={{
          position: 'absolute',
          right: 8,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: 2,
                display: 'flex',
                alignItems: 'center'
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <div style={{
            backgroundColor: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: '0.65rem',
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
            pointerEvents: 'none'
          }}>
            Ctrl+K
          </div>
        </div>

        {/* Interactive Instant Search Results Dropdown */}
        {isSearchOpen && cleanQuery.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              maxHeight: 400,
              overflowY: 'auto'
            }}
          >
            {/* Header info bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              borderBottom: '1px solid #E2E8F0',
              backgroundColor: '#EFF6FF',
              fontSize: '0.72rem',
              color: 'var(--primary-color)'
            }}>
              <span>Search Results for "<strong>{searchQuery}</strong>"</span>
              <span style={{ color: 'var(--text-muted)' }}>{totalMatches} matches found</span>
            </div>

            {totalMatches === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <Package size={28} color="#64748B" style={{ marginBottom: 8 }} />
                <div>No items or invoices matching "<strong>{searchQuery}</strong>"</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Try searching for Paracetamol, Amoxicillin, Masks, or an invoice number.
                </div>
              </div>
            ) : (
              <div>
                {/* 1. Products & Inventory Alerts */}
                {matchingSuggestions.length > 0 && (
                  <div>
                    <div style={{
                      padding: '8px 12px 4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Products & Stock Status
                    </div>
                    {matchingSuggestions.map((item) => (
                      <div
                        key={item.productId}
                        onClick={() => {
                          if (onSelectProduct) {
                            onSelectProduct(item.productSku, item.productName);
                          }
                          setIsSearchOpen(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Package size={16} color="var(--primary-color)" />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {item.productName}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              SKU: <code style={{ color: 'var(--primary-color)' }}>{item.productSku}</code> • Stock: <strong>{item.currentStock} units</strong> • ROP: {item.reorderPoint}u
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`badge ${item.urgencyLevel === 'Critical' ? 'badge-rose' : 'badge-amber'}`} style={{ fontSize: '0.65rem' }}>
                            {item.urgencyLevel}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSearchOpen(false);
                              onRunForecastClick();
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '3px 8px', fontSize: '0.7rem' }}
                            title="Run AI forecast"
                          >
                            <Sparkles size={11} color="var(--primary-color)" />
                            <span>Forecast</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Sales Invoices */}
                {matchingSales.length > 0 && (
                  <div>
                    <div style={{
                      padding: '10px 12px 4px',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Matching Sales Transactions
                    </div>
                    {matchingSales.map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => {
                          setIsSearchOpen(false);
                          const ledgerElem = document.getElementById('sales-ledger-section');
                          if (ledgerElem) {
                            ledgerElem.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #F1F5F9',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <FileText size={16} color="#059669" />
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {sale.invoiceNumber}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {new Date(sale.saleDateUtc).toLocaleDateString()} • {sale.customerReference || 'Walk-in'} • {sale.items.length} items
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>
                            ${sale.totalAmount.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--primary-color)' }}>
                            View in Ledger &rarr;
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick Action Footer */}
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#F8FAFC',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                Press <kbd style={{ background: '#E2E8F0', padding: '1px 4px', borderRadius: 3, color: 'var(--text-primary)' }}>Esc</kbd> to close
              </span>
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  onRunForecastClick();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-color)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <span>Run Forecast for "{cleanQuery}"</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right: Refresh, Agent Trace, + Quick Action Dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <button
          onClick={onRefreshData}
          title="Refresh analytics & sales logs"
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '7px 10px',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <RefreshCw size={15} className={isRefreshing ? 'spin-animation' : ''} />
        </button>

        <button
          onClick={onOpenAgentTrace}
          style={{
            background: '#F5F3FF',
            border: '1px solid #DDD6FE',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 12px',
            color: '#6D28D9',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Bot size={15} color="#7C3AED" />
          <span>Agent Trace</span>
        </button>

        {/* Modern '+ New' Quick Action Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="btn btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.82rem' }}
          >
            <Plus size={15} />
            <span>New</span>
          </button>

          {showQuickMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 42,
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.15)',
                width: 200,
                zIndex: 100,
                overflow: 'hidden'
              }}
            >
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, padding: '10px 14px 4px', textTransform: 'uppercase' }}>
                Quick Create
              </div>
              <button
                onClick={() => {
                  setShowQuickMenu(false);
                  onRecordSaleClick();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 14px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Receipt size={15} color="var(--primary-color)" />
                <span>Record New Sale</span>
              </button>

              <button
                onClick={() => {
                  setShowQuickMenu(false);
                  onRunForecastClick();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 14px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Sparkles size={15} color="#7C3AED" />
                <span>Run Forecast Agent</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
