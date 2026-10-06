import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { SalesPageHeader } from '../components/layout/SalesPageHeader';
import { SalesPageIntro } from '../components/layout/SalesPageIntro';
import { ActivityPipeline } from '../components/sales/ActivityPipeline';
import { TopSellingWidget } from '../components/sales/TopSellingWidget';
import { DemandTrendsWidget } from '../components/sales/DemandTrendsWidget';
import { BranchCategoryInsights } from '../components/sales/BranchCategoryInsights';
import { CustomerBehaviorWidget } from '../components/sales/CustomerBehaviorWidget';
import { RecordSaleModal } from '../components/sales/RecordSaleModal';
import { useSalesDemandData } from '../hooks/useSalesDemandData';
import '../sales.css';

export default function SalesOverviewPage() {
  const data = useSalesDemandData({ analytics: true });
  const [isRecordSaleOpen, setIsRecordSaleOpen] = useState(false);

  return (
    <div className="sales-module">
      <SalesPageHeader
        pageLabel="Overview"
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
        eyebrow="Sales & Demand"
        title="Performance Overview"
        description="A consolidated view of sales velocity, stock pressure, branch performance and customer buying patterns."
        icon={BarChart3}
        meta={<><strong>{data.analytics?.totalTransactions ?? 0}</strong><span>transactions · last 30 days</span></>}
      />

      <ActivityPipeline analytics={data.analytics} reorderSuggestions={data.filteredSuggestions} />

      <div className="sales-dashboard-grid sales-dashboard-grid--wide">
        <TopSellingWidget products={data.analytics?.topSellingProducts || []} slowMovers={data.analytics?.slowMovingProducts || []} />
        <DemandTrendsWidget dailyTrends={data.analytics?.dailyTrends || []} dayOfWeekPatterns={data.analytics?.dayOfWeekPatterns || []} />
      </div>

      <div className="sales-dashboard-grid">
        <BranchCategoryInsights
          branches={data.analytics?.branchComparisons || []}
          categories={data.analytics?.categoryShares || []}
          allBranches={data.availableBranches}
        />
        <CustomerBehaviorWidget behavior={data.analytics?.customerBehavior || null} />
      </div>

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
