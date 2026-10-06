import React, { useState } from 'react';
import { ReceiptText } from 'lucide-react';
import { SalesPageHeader } from '../components/layout/SalesPageHeader';
import { SalesPageIntro } from '../components/layout/SalesPageIntro';
import { SalesLedgerTable } from '../components/sales/SalesLedgerTable';
import { RecordSaleModal } from '../components/sales/RecordSaleModal';
import { useSalesDemandData } from '../hooks/useSalesDemandData';
import '../sales.css';

export default function SalesRecordsPage() {
  const data = useSalesDemandData();
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);

  return (
    <div className="sales-module">
      <SalesPageHeader
        pageLabel="Sales Records"
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
        eyebrow="Transaction Ledger"
        title="Sales Records"
        description="Search, filter and review sales transactions from a dedicated ledger workspace. New sales can be recorded directly from here."
        icon={ReceiptText}
        meta={<><strong>{data.filteredSales.length}</strong><span>records loaded</span></>}
      />

      <SalesLedgerTable
        sales={data.filteredSales}
        isLoading={data.isLoading}
        externalSearch={data.searchQuery}
        branches={data.availableBranches}
      />

      <RecordSaleModal
        isOpen={isRecordSaleOpen}
        onClose={() => setIsRecordSaleOpen(false)}
        onSaleCreated={data.refresh}
        branches={data.availableBranches}
        products={data.availableProducts}
      />
    </div>
  );
}
