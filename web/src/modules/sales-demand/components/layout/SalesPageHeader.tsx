import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TopHeader } from './TopHeader';
import type { BranchOption, ReorderSuggestion, Sale } from '../../types/sales';

interface Props {
  pageLabel: string;
  branches: BranchOption[];
  selectedBranch: string;
  setSelectedBranch: (branch: string) => void;
  onRecordSaleClick: () => void;
  onForecastClick?: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  reorderSuggestions: ReorderSuggestion[];
  sales: Sale[];
}

export const SalesPageHeader: React.FC<Props> = ({
  pageLabel,
  branches,
  selectedBranch,
  setSelectedBranch,
  onRecordSaleClick,
  onForecastClick,
  onRefreshData,
  isRefreshing,
  searchQuery,
  setSearchQuery,
  reorderSuggestions,
  sales,
}) => {
  const navigate = useNavigate();

  return (
    <TopHeader
      pageLabel={pageLabel}
      branches={branches}
      selectedBranch={selectedBranch}
      setSelectedBranch={setSelectedBranch}
      onRecordSaleClick={onRecordSaleClick}
      onRunForecastClick={onForecastClick ?? (() => navigate('/sales/forecast'))}
      onOpenSalesRecords={() => navigate('/sales/records')}
      onRefreshData={onRefreshData}
      isRefreshing={isRefreshing}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      reorderSuggestions={reorderSuggestions}
      sales={sales}
    />
  );
};
