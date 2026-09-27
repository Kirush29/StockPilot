import { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../../api/inventoryApi';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import { PermissionErrorBanner } from '../../components/ui/PermissionErrorBanner';
import { RefreshCw, Box, Package, AlertCircle } from 'lucide-react';

export default function InventoryDashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionError(null);
    try {
      const [allRes, lowRes]: any = await Promise.all([
        inventoryApi.getAll(),
        inventoryApi.getLowStock(),
      ]);
      setItems(allRes.data ?? []);
      setLowStock(lowRes.data ?? []);
    } catch (err: any) {
      if (err.status === 403) {
        setPermissionError('You do not have permission to perform this action.');
      } else {
        setError(err.data?.title ?? err.message ?? 'Failed to load inventory dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalItems = items.length;
  const totalQty = items.reduce((sum, i) => sum + (Number(i.quantityOnHand) || 0), 0);
  const lowStockCount = lowStock.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-h)]">Inventory Dashboard</h1>
          <p className="text-[var(--text)] mt-1">Real-time stock tracking and operational metrics</p>
        </div>
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

      {permissionError && (
        <PermissionErrorBanner message={permissionError} onDismiss={() => setPermissionError(null)} />
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1,2,3].map(k => <CardSkeleton key={k} />)}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={fetchData} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Total Products Tracked" value={totalItems.toLocaleString()} subtext="Across all branch locations" icon={Box} variant="primary" />
          <StatCard label="Total Units On Hand" value={totalQty.toLocaleString()} subtext="Available & reserved stock" icon={Package} variant="success" />
          <StatCard label="Low Stock Alert" value={lowStockCount.toLocaleString()} subtext={lowStockCount > 0 ? 'Items below reorder point' : 'All stock levels healthy'} icon={AlertCircle} variant={lowStockCount > 0 ? 'warning' : 'success'} />
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--border)]">
            <h3 className="text-lg font-semibold text-[var(--text-h)]">Stock Items Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-[var(--text)]">
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">SKU</th>
                  <th className="p-4 font-semibold">Branch</th>
                  <th className="p-4 font-semibold text-right">On Hand</th>
                  <th className="p-4 font-semibold text-right">Available</th>
                  <th className="p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-h)]">
                {items.map(item => {
                  const qty = Number(item.quantityOnHand) || 0;
                  const isLow = item.isLowStock;
                  return (
                    <tr key={item.inventoryId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="p-4 font-medium">{item.productName}</td>
                      <td className="p-4"><span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-[var(--border)]">{item.sku}</span></td>
                      <td className="p-4">{item.branchName}</td>
                      <td className="p-4 text-right font-mono font-bold">{qty.toLocaleString()}</td>
                      <td className="p-4 text-right font-mono font-bold">{(Number(item.availableQuantity) || 0).toLocaleString()}</td>
                      <td className="p-4"><Badge variant={isLow ? 'warning' : 'success'}>{isLow ? 'Low Stock' : 'Healthy'}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState title="No Inventory Records" description="No inventory items found for your account." />
      )}
    </div>
  );
}
