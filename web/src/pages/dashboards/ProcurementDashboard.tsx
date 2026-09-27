import { useState, useEffect, useCallback } from 'react';
import { inventoryApi, batchesApi } from '../../api/inventoryApi';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { RefreshCw, AlertCircle, Clock, Box, Package } from 'lucide-react';

export default function ProcurementDashboard() {
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allRes, lowRes, expiringRes]: any = await Promise.all([
        inventoryApi.getAll().catch(err => { console.error(err); return { data: [] }; }),
        inventoryApi.getLowStock().catch(err => { console.error(err); return { data: [] }; }),
        batchesApi.getExpiring(60).catch(err => { console.error(err); return { data: [] }; }),
      ]);
      setAllItems(allRes.data ?? []);
      setLowStock(lowRes.data ?? []);
      setExpiring(expiringRes.data ?? []);
    } catch (err: any) {
      setError(err.data?.title ?? err.message ?? 'Failed to load procurement data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const outOfStock = allItems.filter(i => (Number(i.quantityOnHand) || 0) === 0);
  const criticalItems = [...outOfStock, ...lowStock.filter(i => !outOfStock.find(o => o.inventoryId === i.inventoryId))];
  const expiringCount = expiring.length;
  const totalProducts = allItems.length;
  const needsReorder = criticalItems.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-h)]">Procurement Overview</h1>
          <p className="text-[var(--text)] mt-1">Monitor reorder alerts, expiring stock, and items requiring procurement action</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1f2028] border border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-800 text-[var(--text-h)] text-sm font-medium rounded-lg transition-colors"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(k => <CardSkeleton key={k} />)}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={fetchData} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Products" value={totalProducts.toLocaleString()} subtext="Tracked across all locations" icon={Package} variant="primary" />
          <StatCard label="Needs Reorder" value={needsReorder.toLocaleString()} subtext={needsReorder > 0 ? 'Items at or below reorder point' : 'All levels healthy'} icon={AlertCircle} variant={needsReorder > 0 ? 'danger' : 'success'} />
          <StatCard label="Out of Stock" value={outOfStock.length.toLocaleString()} subtext={outOfStock.length > 0 ? 'Requires immediate action' : 'No depleted items'} icon={Box} variant={outOfStock.length > 0 ? 'danger' : 'success'} />
          <StatCard label="Expiring (60d)" value={expiringCount.toLocaleString()} subtext={expiringCount > 0 ? 'Batches expiring within 60 days' : 'No near-expiry batches'} icon={Clock} variant={expiringCount > 0 ? 'warning' : 'success'} />
        </div>
      )}

      {!loading && !error && criticalItems.length > 0 && (
        <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-h)] flex items-center gap-2">
                Procurement Action Required
                <span className="bg-red-100 text-red-800 text-xs py-0.5 px-2 rounded-full">{criticalItems.length} items</span>
              </h3>
              <p className="text-xs text-[var(--text)] mt-1">Items at or below reorder point that require procurement attention</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-[var(--text)]">
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">SKU</th>
                  <th className="p-4 font-semibold">Branch</th>
                  <th className="p-4 font-semibold text-right">On Hand</th>
                  <th className="p-4 font-semibold text-right">Reorder Level</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-h)]">
                {criticalItems.map(item => {
                  const qty = Number(item.quantityOnHand) || 0;
                  const isOut = qty === 0;
                  return (
                    <tr key={item.inventoryId} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${isOut ? 'bg-red-50/30 dark:bg-red-900/10' : 'bg-yellow-50/30 dark:bg-yellow-900/10'}`}>
                      <td className="p-4 font-medium">{item.productName || item.product?.name}</td>
                      <td className="p-4"><span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-[var(--border)]">{item.sku || item.product?.sku}</span></td>
                      <td className="p-4 text-[var(--text)]">{item.branchName || item.branch?.name}</td>
                      <td className="p-4 text-right font-mono font-bold"><span className={isOut ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}>{qty.toLocaleString()}</span></td>
                      <td className="p-4 text-right font-mono text-[var(--text)]">{(Number(item.reorderLevel) || Number(item.product?.reorderLevel) || 0).toLocaleString()}</td>
                      <td className="p-4"><Badge variant={isOut ? 'danger' : 'warning'}>{isOut ? 'Out of Stock' : 'Low Stock'}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && criticalItems.length === 0 && (
        <EmptyState title="All Stock Levels Healthy" description="No items currently require procurement action. All inventory is at or above reorder levels." />
      )}

      {!loading && !error && expiring.length > 0 && (
        <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[var(--text-h)] flex items-center gap-2">
              Expiring Batches (Next 60 Days)
              <span className="bg-yellow-100 text-yellow-800 text-xs py-0.5 px-2 rounded-full">{expiring.length} batches</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-[var(--text)]">
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">Batch #</th>
                  <th className="p-4 font-semibold">Branch</th>
                  <th className="p-4 font-semibold text-right">Qty Remaining</th>
                  <th className="p-4 font-semibold">Expiry Date</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-h)]">
                {expiring.map(batch => {
                  const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - new Date().getTime()) / 86400000);
                  return (
                    <tr key={batch.batchId} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors ${daysLeft <= 14 ? 'bg-red-50/30 dark:bg-red-900/10' : 'bg-yellow-50/30 dark:bg-yellow-900/10'}`}>
                      <td className="p-4 font-medium">{batch.productName || batch.product?.name}</td>
                      <td className="p-4"><span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-[var(--border)]">{batch.batchNumber}</span></td>
                      <td className="p-4 text-[var(--text)]">{batch.branchName || batch.branch?.name}</td>
                      <td className="p-4 text-right font-mono font-bold">{(Number(batch.remainingQuantity) || 0).toLocaleString()}</td>
                      <td className="p-4 text-sm">{new Date(batch.expiryDate).toLocaleDateString()}</td>
                      <td className="p-4"><Badge variant={daysLeft <= 14 ? 'danger' : 'warning'}>{daysLeft}d left</Badge></td>
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
