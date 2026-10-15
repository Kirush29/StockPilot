import React, { useState, useEffect } from 'react';
// Fix applied: resolved syntax error causing empty screen
// Additional fix: corrected brace count in button onClick handler
import { AlertTriangle, ArrowRight, ShoppingCart, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SalesPageHeader } from '../components/layout/SalesPageHeader';
import { SalesPageIntro } from '../components/layout/SalesPageIntro';
import { ReorderTable } from '../components/sales/ReorderTable';
import { RecordSaleModal } from '../components/sales/RecordSaleModal';
import { useSalesDemandData } from '../hooks/useSalesDemandData';
import type { ReorderSuggestion } from '../types/sales';
import '../sales.css';

export default function ReorderAlertsPage() {
  const navigate = useNavigate();
  const data = useSalesDemandData();

  // Handle case where data is null or undefined (hook error)
  if (data == null) {
    return (
      <div className="sales-module">
        <div className="alert alert-error">
          <h3>Error Loading Data</h3>
          <p>Unable to load reorder alerts data. Please try again.</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const [proposalItem, setProposalItem] = useState<ReorderSuggestion | null>(null);
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const [dispatchedIds, setDispatchedIds] = useState<string[]>(() => {
    try {
      const item = localStorage.getItem('stockpilot_dispatched_reorders');
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          // Filter to only include strings and trim whitespace
          return parsed
            .filter((id): id is string => typeof id === 'string')
            .map((id) => id.trim())
            .filter((id) => id.length > 0);
        }
      }
      return [];
    } catch (error) {
      console.warn('Failed to parse dispatched IDs from localStorage:', error);
      return [];
    }
  });

  // Sync with localStorage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'stockpilot_dispatched_reorders') {
        try {
          const newValue = e.newValue;
          if (newValue !== null) {
            const parsed = JSON.parse(newValue);
            if (Array.isArray(parsed)) {
              const filtered = parsed
                .filter((id): id is string => typeof id === 'string')
                .map((id) => id.trim())
                .filter((id) => id.length > 0);
              setDispatchedIds(filtered);
            }
          } else {
            setDispatchedIds([]);
          }
        } catch (error) {
          console.warn('Failed to parse dispatched IDs from storage event:', error);
          setDispatchedIds([]);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Ensure searchedSuggestions is an array before filtering
  const searchSuggestionsArray = Array.isArray(data.searchedSuggestions)
    ? data.searchedSuggestions
    : [];

  const activeSuggestions = searchSuggestionsArray.filter(
    (item) =>
      item &&
      item.needsReorder !== false &&
      item.productId != null &&
      !dispatchedIds.includes(String(item.productId).trim())
  );
  const critical = activeSuggestions.filter((item) => item.urgencyLevel === 'Critical').length;

  return (
    <div className="sales-module">
      <SalesPageHeader
        pageLabel="Reorder Alerts"
        branches={data.availableBranches}
        selectedBranch={data.selectedBranch}
        setSelectedBranch={data.setSelectedBranch}
        onRecordSaleClick={() => setIsRecordSaleOpen(true)}
        onRefreshData={() => {
          localStorage.removeItem('stockpilot_dispatched_reorders');
          setDispatchedIds([]);
          data.refresh();
        }}
        isRefreshing={data.isRefreshing}
        searchQuery={data.searchQuery}
        setSearchQuery={data.setSearchQuery}
        reorderSuggestions={activeSuggestions}
        sales={data.filteredSales}
      />

      <SalesPageIntro
        eyebrow="Inventory Pressure"
        title="Reorder Alerts"
        description="Prioritize products approaching their reorder point and hand approved candidates into the Procurement replenishment workflow."
        icon={AlertTriangle}
        meta={<><strong>{critical}</strong><span>critical alerts</span></>}
      />

      {data.searchQuery != null && String(data.searchQuery).trim() !== "" && (
        <div className="sales-search-banner">
          Showing {activeSuggestions.length} reorder alert{activeSuggestions.length === 1 ? '' : 's'} matching “{data.searchQuery}”.
          <button onClick={() => data.setSearchQuery('')}>Clear</button>
        </div>
      )}

      <ReorderTable suggestions={activeSuggestions} onDraftPurchaseProposal={setProposalItem} />

      <RecordSaleModal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        onSaleCreated={data.refresh}
        branches={data.availableBranches}
        products={data.availableProducts}
      />

      {proposalItem && (
        <div className="modal-overlay" onClick={() => setProposalItem(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="sales-proposal-heading">
              <div className="sales-proposal-title">
                <div className="sales-proposal-icon"><ShoppingCart size={20} /></div>
                <div><h3>Draft Purchase Proposal</h3><p>Demand signal → Procurement replenishment workflow</p></div>
              </div>
              <button className="sales-icon-button" onClick={() => setProposalItem(null)} aria-label="Close"><X size={18} /></button>
            </div>

            <div className="sales-proposal-summary">
              <div>Product<strong>{proposalItem.productName}</strong></div>
              <div>SKU<strong>{proposalItem.productSku}</strong></div>
              <div>Branch<strong>{proposalItem.branchName}</strong></div>
              <div>Current stock<strong className="sales-value-danger">{proposalItem.currentStock} units</strong></div>
              <div>Reorder point<strong>{proposalItem.reorderPoint} units</strong></div>
              <div>Suggested quantity<strong className="sales-value-success">{proposalItem.recommendedOrderQuantity} units</strong></div>
            </div>

            <div className="sales-human-approval-note">
              The demand workflow creates a structured proposal only. Purchase-order creation still requires an authorized human approval.
            </div>

            <div className="sales-modal-actions">
              <button className="btn btn-secondary" onClick={() => setProposalItem(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={(() => {
                  if (!proposalItem) return;
                  const productId = String(proposalItem.productId).trim();
                  if (!productId) return;

                  const query = new URLSearchParams({
                    branchId: String(proposalItem.branchId || '').trim(),
                    productId: productId
                  });

                  // Create new array with the dispatched item, avoiding duplicates
                  const updated = [...new Set([...dispatchedIds, productId])];

                  try {
                    setDispatchedIds(updated);
                    localStorage.setItem('stockpilot_dispatched_reorders', JSON.stringify(updated));
                  } catch (error) {
                    console.error('Failed to save dispatched IDs:', error);
                  }

                  setProposalItem(null);
                  navigate(`/procurement/replenishment?${query}`);
                }) }>
                Dispatch to Procurement Agent <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}