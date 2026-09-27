import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { inventoryApi, transfersApi, batchesApi } from '../../api/inventoryApi';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import { CardSkeleton } from '../../components/ui/Skeleton';
import AiInsightsWidget from '../../components/ui/AiInsightsWidget';
import { RefreshCw, ArrowRightLeft, Clock, Box } from 'lucide-react';

const STATUS_VARIANT: Record<string, any> = {
  Pending: 'warning',
  Approved: 'info',
  Shipped: 'primary',
  Received: 'success',
  Rejected: 'danger',
  Cancelled: 'default',
};

export default function BranchManagerDashboard() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, trRes, expRes]: any = await Promise.all([
        inventoryApi.getLowStock().catch(err => { console.error(err); return { data: [] }; }),
        transfersApi.getAll().catch(err => { console.error(err); return { data: [] }; }),
        batchesApi.getExpiring(30).catch(err => { console.error(err); return { data: [] }; }),
      ]);
      setInventory(invRes.data ?? []);
      setTransfers(trRes.data ?? []);
      setExpiring(expRes.data ?? []);
    } catch (err: any) {
      setError(err.data?.title ?? err.message ?? 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeTransfers = transfers.filter(t => ['Pending','Approved','Shipped'].includes(t.status));
  const lowStockCount = inventory.length;
  const expiringCount = expiring.length;
  const pendingApprovals = transfers.filter(t => t.status === 'Pending').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-h)]">Branch Manager Dashboard</h1>
          <p className="text-[var(--text)] mt-1">Monitor your branch stock health, pending transfers, and expiry alerts</p>
        </div>
        <div className="flex gap-3">
          <Link to="/transfers" className="inline-flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors">
            <ArrowRightLeft size={16} />
            Manage Transfers
          </Link>
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
          <StatCard label="Low Stock Items" value={lowStockCount.toLocaleString()} subtext={lowStockCount > 0 ? 'Request transfers to restock' : 'All levels healthy'} icon={Box} variant={lowStockCount > 0 ? 'warning' : 'success'} />
          <StatCard label="Pending Approvals" value={pendingApprovals.toLocaleString()} subtext={pendingApprovals > 0 ? 'Transfers awaiting your approval' : 'No pending approvals'} icon={ArrowRightLeft} variant={pendingApprovals > 0 ? 'warning' : 'success'} />
          <StatCard label="Active Transfers" value={activeTransfers.length.toLocaleString()} subtext="In-progress transfer requests" icon={ArrowRightLeft} variant="primary" />
          <StatCard label="Expiring Batches" value={expiringCount.toLocaleString()} subtext={expiringCount > 0 ? 'Within next 30 days' : 'No near-expiry batches'} icon={Clock} variant={expiringCount > 0 ? 'warning' : 'success'} />
        </div>
      )}

      {!loading && !error && (
        <AiInsightsWidget />
      )}

      {!loading && !error && activeTransfers.length > 0 && (
        <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[var(--text-h)] flex items-center gap-2">
              Active Transfers
              <span className="bg-gray-100 text-gray-800 text-xs py-0.5 px-2 rounded-full">{activeTransfers.length}</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-[var(--text)]">
                  <th className="p-4 font-semibold">Transfer #</th>
                  <th className="p-4 font-semibold">From</th>
                  <th className="p-4 font-semibold">To</th>
                  <th className="p-4 font-semibold text-right">Items</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-h)]">
                {activeTransfers.slice(0, 10).map(t => (
                  <tr key={t.stockTransferId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="p-4"><span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-[var(--border)]">{t.transferNumber}</span></td>
                    <td className="p-4">{t.sourceBranch?.name || 'Unknown'}</td>
                    <td className="p-4">{t.destinationBranch?.name || 'Unknown'}</td>
                    <td className="p-4 text-right">{t.items?.length ?? 0}</td>
                    <td className="p-4"><Badge variant={STATUS_VARIANT[t.status] ?? 'default'}>{t.status}</Badge></td>
                    <td className="p-4 text-xs text-[var(--text)]">{new Date(t.requestedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeTransfers.length > 10 && (
            <div className="p-4 border-t border-[var(--border)] text-center">
              <Link to="/transfers" className="text-sm text-black dark:text-purple-400 font-medium hover:underline">
                View all {activeTransfers.length} transfers &rarr;
              </Link>
            </div>
          )}
        </div>
      )}

      {!loading && !error && lowStockCount > 0 && (
        <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[var(--text-h)] flex items-center gap-2">
              Low Stock — Transfer Required
              <span className="bg-red-100 text-red-800 text-xs py-0.5 px-2 rounded-full">{lowStockCount}</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-[var(--text)]">
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">SKU</th>
                  <th className="p-4 font-semibold text-right">On Hand</th>
                  <th className="p-4 font-semibold text-right">Reorder Level</th>
                  <th className="p-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-h)]">
                {inventory.map(item => {
                  const qty = Number(item.quantityOnHand) || 0;
                  const isCrit = qty === 0;
                  return (
                    <tr key={item.inventoryId} className={isCrit ? 'bg-red-50/30 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' : 'bg-yellow-50/30 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'}>
                      <td className="p-4 font-medium">{item.product?.name}</td>
                      <td className="p-4"><span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-[var(--border)]">{item.product?.sku}</span></td>
                      <td className="p-4 text-right font-mono font-bold text-[15px]"><span className={isCrit ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}>{qty.toLocaleString()}</span></td>
                      <td className="p-4 text-right font-mono text-[var(--text)]">{(Number(item.product?.reorderLevel) || 0).toLocaleString()}</td>
                      <td className="p-4">
                        <Link to="/transfers/new" className="text-xs text-black dark:text-purple-400 font-semibold hover:underline">
                          Request Transfer &rarr;
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && activeTransfers.length === 0 && lowStockCount === 0 && (
        <EmptyState title="Everything Looks Good" description="No low stock items or active transfers to manage right now." />
      )}
    </div>
  );
}
