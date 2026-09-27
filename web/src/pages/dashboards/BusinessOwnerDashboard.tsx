import React, { useState, useEffect, useCallback } from 'react';
import { inventoryApi, batchesApi } from '../../api/inventoryApi';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import AiInsightsWidget from '../../components/ui/AiInsightsWidget';
import { Search, RefreshCw, Box, Package, AlertCircle, Clock, X } from 'lucide-react';

export default function BusinessOwnerDashboard() {
  const [allItems, setAllItems] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [expiringBatches, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allRes, lowRes, expiringRes]: any = await Promise.all([
        inventoryApi.getAll().catch(err => { console.error(err); return { data: [] }; }),
        inventoryApi.getLowStock().catch(err => { console.error(err); return { data: [] }; }),
        batchesApi.getExpiring(30).catch(err => { console.error(err); return { data: [] }; }),
      ]);
      setAllItems(allRes.data ?? []);
      setLowStock(lowRes.data ?? []);
      setExpiring(expiringRes.data ?? []);
    } catch (err: any) {
      setError(err.data?.title ?? err.message ?? 'Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchTerm.trim();
    if (!term) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res: any = await inventoryApi.search(term);
      setSearchResults(res.data ?? []);
    } catch (err: any) {
      setError(err.data?.title ?? 'Search query failed.');
    } finally {
      setSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults(null);
  };

  const totalItems = allItems.length;
  const totalQty = allItems.reduce((sum, i) => sum + (Number(i.quantityOnHand) || 0), 0);
  const lowStockCount = lowStock.length;
  const outOfStock = allItems.filter(i => (Number(i.quantityOnHand) || 0) === 0).length;
  const expiringCount = expiringBatches.length;

  const tableData = searchResults ?? allItems;
  const isFiltered = searchResults !== null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-h)]">Business Overview</h1>
          <p className="text-[var(--text)] mt-1">Complete inventory health, stock levels, and alerts across all branches</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1f2028] border border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-800 text-[var(--text-h)] text-sm font-medium rounded-lg transition-colors"
            onClick={fetchDashboard}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && allItems.length > 0 && (
        <ErrorState error={error} onRetry={fetchDashboard} />
      )}

      <AiInsightsWidget />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(k => <CardSkeleton key={k} />)}
        </div>
      ) : !error || allItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Products Tracked" value={totalItems.toLocaleString()} subtext="Across all branch locations" icon={Box} variant="primary" />
          <StatCard label="Total Units On Hand" value={totalQty.toLocaleString()} subtext="Available & reserved stock" icon={Package} variant="success" />
          <StatCard label="Low Stock Alert" value={lowStockCount.toLocaleString()} subtext={lowStockCount > 0 ? 'Items below reorder point' : 'All stock levels healthy'} icon={AlertCircle} variant={lowStockCount > 0 ? 'warning' : 'success'} />
          <StatCard label="Out of Stock" value={outOfStock.toLocaleString()} subtext={outOfStock > 0 ? 'Requires replenishment' : 'No depleted inventory items'} icon={AlertCircle} variant={outOfStock > 0 ? 'danger' : 'success'} />
          {expiringCount > 0 && (
            <StatCard label="Expiring Batches" value={expiringCount.toLocaleString()} subtext="Within the next 30 days" icon={Clock} variant="warning" />
          )}
        </div>
      ) : null}

      {!loading && (allItems.length > 0 || isFiltered) && (
        <form className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center" onSubmit={handleSearch}>
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-gray-800 border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="Search products by name, SKU, or keyword…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button type="button" onClick={handleClearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={16} />
              </button>
            )}
          </div>
          <button type="submit" disabled={searching} className="px-5 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors w-full sm:w-auto">
            {searching ? 'Searching…' : 'Search'}
          </button>
          {isFiltered && (
            <button type="button" onClick={handleClearSearch} className="px-5 py-2 bg-white dark:bg-gray-800 border border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-700 text-[var(--text-h)] text-sm font-medium rounded-lg transition-colors w-full sm:w-auto">
              Clear Search
            </button>
          )}
        </form>
      )}

      {loading ? (
        <div className="p-4 bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl"><CardSkeleton /></div>
      ) : error && allItems.length === 0 ? (
        <ErrorState error={error} onRetry={fetchDashboard} />
      ) : tableData.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'No search results found' : 'No inventory records found'}
          description={isFiltered ? `No products match "${searchTerm}".` : 'There are currently no items tracked in the inventory.'}
        />
      ) : (
        <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[var(--text-h)] flex items-center gap-2">
              Stock Overview
              <span className="bg-gray-100 dark:bg-gray-800 text-[var(--text)] text-xs py-0.5 px-2 rounded-full border border-[var(--border)]">{tableData.length}</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-[var(--text)]">
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">SKU</th>
                  <th className="p-4 font-semibold">Branch</th>
                  <th className="p-4 font-semibold text-right">On Hand</th>
                  <th className="p-4 font-semibold text-right">Reserved</th>
                  <th className="p-4 font-semibold text-right">Available</th>
                  <th className="p-4 font-semibold">Health Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-h)]">
                {tableData.map(item => {
                  const qty = Number(item.quantityOnHand) || 0;
                  const reorder = Number(item.reorderLevel) || 0;
                  const isOut = qty === 0;
                  const isLow = qty <= reorder;

                  let rowClass = 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ';
                  let badgeVariant: any = 'success';
                  let badgeLabel = 'Healthy';

                  if (isOut) {
                    rowClass += 'bg-red-50/30 dark:bg-red-900/10';
                    badgeVariant = 'danger';
                    badgeLabel = 'Out of Stock';
                  } else if (isLow) {
                    rowClass += 'bg-yellow-50/30 dark:bg-yellow-900/10';
                    badgeVariant = 'warning';
                    badgeLabel = 'Low Stock';
                  }

                  return (
                    <tr key={item.inventoryId} className={rowClass}>
                      <td className="p-4 font-medium">{item.productName || item.product?.name}</td>
                      <td className="p-4"><span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-[var(--border)]">{item.sku || item.product?.sku}</span></td>
                      <td className="p-4 text-[var(--text)]">{item.branchName || item.branch?.name}</td>
                      <td className="p-4 text-right font-mono font-bold">
                        <span className={isOut ? 'text-red-600 dark:text-red-400' : ''}>{qty.toLocaleString()}</span>
                      </td>
                      <td className="p-4 text-right font-mono text-[var(--text)]">{(Number(item.reservedQuantity) || 0).toLocaleString()}</td>
                      <td className="p-4 text-right font-mono font-bold">{(Number(item.availableQuantity) || 0).toLocaleString()}</td>
                      <td className="p-4"><Badge variant={badgeVariant}>{badgeLabel}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
