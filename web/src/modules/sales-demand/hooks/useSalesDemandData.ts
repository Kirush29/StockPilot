import { useCallback, useEffect, useMemo, useState } from 'react';
import { branchApi, categoryApi, demandApi, productApi, salesApi } from '../services/api';
import type { BranchOption, CategoryOption, ProductOption, ReorderSuggestion, Sale, SalesAnalyticsSummary } from '../types/sales';

interface Options {
  analytics?: boolean;
}

export function useSalesDemandData(options: Options = {}) {
  const { analytics: includeAnalytics = false } = options;
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableBranches, setAvailableBranches] = useState<BranchOption[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductOption[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [branches, products, salesData, suggestions, analyticsData, categories] = await Promise.all([
        branchApi.getBranches(),
        productApi.getProducts(),
        salesApi.getSales(),
        demandApi.getReorderSuggestions(),
        includeAnalytics ? salesApi.getAnalytics(undefined, 30) : Promise.resolve(null),
        includeAnalytics ? categoryApi.getCategories() : Promise.resolve([]),
      ]);
      setAvailableBranches(branches);
      setAvailableProducts(products);
      setAvailableCategories(categories);
      setSales(salesData);
      setReorderSuggestions(suggestions);
      if (includeAnalytics) setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load Sales & Demand data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [includeAnalytics]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedBranchObj = useMemo(() => {
    if (selectedBranch === 'All Branches') return null;
    return availableBranches.find((branch) => branch.name === selectedBranch || branch.branchId === selectedBranch) ?? null;
  }, [availableBranches, selectedBranch]);

  const filteredSales = useMemo(() => {
    if (selectedBranch === 'All Branches') return sales;
    return sales.filter((sale) =>
      (selectedBranchObj && sale.branchId === selectedBranchObj.branchId) ||
      sale.branchName.toLowerCase().includes(selectedBranch.toLowerCase()),
    );
  }, [sales, selectedBranch, selectedBranchObj]);

  const filteredSuggestions = useMemo(() => {
    if (selectedBranch === 'All Branches') return reorderSuggestions;
    return reorderSuggestions.filter((suggestion) =>
      (selectedBranchObj && suggestion.branchId === selectedBranchObj.branchId) ||
      suggestion.branchName.toLowerCase().includes(selectedBranch.toLowerCase()),
    );
  }, [reorderSuggestions, selectedBranch, selectedBranchObj]);

  const searchedSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return filteredSuggestions;
    return filteredSuggestions.filter((suggestion) =>
      suggestion.productName.toLowerCase().includes(query) ||
      suggestion.productSku.toLowerCase().includes(query) ||
      suggestion.branchName.toLowerCase().includes(query),
    );
  }, [filteredSuggestions, searchQuery]);

  return {
    selectedBranch,
    setSelectedBranch,
    searchQuery,
    setSearchQuery,
    availableBranches,
    availableProducts,
    availableCategories,
    sales,
    filteredSales,
    reorderSuggestions,
    filteredSuggestions,
    searchedSuggestions,
    analytics,
    isLoading,
    isRefreshing,
    refresh,
  };
}
