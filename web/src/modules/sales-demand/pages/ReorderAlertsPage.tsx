import React, { useState } from 'react';
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
  const [proposalItem, setProposalItem] = useState<ReorderSuggestion | null>(null);
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);
  const critical = data.filteredSuggestions.filter((item) => item.urgencyLevel === 'Critical').length;

  return (
    <div className="sales-module">
      <SalesPageHeader
        pageLabel="Reorder Alerts"
        branches={data.availableBranches}
        selectedBranch={data.selectedBranch}
        setSelectedBranch={data.setSelectedBranch}
        onRecordSaleClick={() => setIsRecordSaleOpen(true)}
        onRefreshData={data.refresh}
        isRefreshing={data.isRefreshing}
        searchQuery={data.searchQuery}
        setSearchQuery={data.setSearchQuery}
        reorderSuggestions={data.filteredSuggestions}
        sales={data.filteredSales}
      />

      <SalesPageIntro
        eyebrow="Inventory Pressure"
        title="Reorder Alerts"
        description="Prioritize products approaching their reorder point and hand approved candidates into the Procurement replenishment workflow."
        icon={AlertTriangle}
        meta={<><strong>{critical}</strong><span>critical alerts</span></>}
      />

      {data.searchQuery.trim() && (
        <div className="sales-search-banner">
          Showing {data.searchedSuggestions.length} reorder alert{data.searchedSuggestions.length === 1 ? '' : 's'} matching “{data.searchQuery}”.
          <button onClick={() => data.setSearchQuery('')}>Clear</button>
        </div>
      )}

      <ReorderTable suggestions={data.searchedSuggestions} onDraftPurchaseProposal={setProposalItem} />

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
              <button className="btn btn-primary" onClick={() => {
                const query = new URLSearchParams({ branchId: proposalItem.branchId, productId: proposalItem.productId });
                setProposalItem(null);
                navigate(`/procurement/replenishment?${query}`);
              }}>
                Dispatch to Procurement Agent <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
