import { useState, useEffect, useCallback } from 'react';
import { optimizationApi, branchesApi } from '../../api/inventoryApi';
import Badge from './Badge';
import { CardSkeleton } from './Skeleton';
import { Sparkles } from 'lucide-react';

export default function AiInsightsWidget() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBranches = useCallback(async () => {
    try {
      const res: any = await branchesApi.getAll();
      const list = res.data ?? [];
      setBranches(list);
      if (list.length > 0) {
        setSelectedBranch(list[0].branchId);
      }
    } catch (err: any) {
      setError('Failed to load branches.');
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const fetchRecommendations = useCallback(async () => {
    if (!selectedBranch) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await optimizationApi.getRecommendations(selectedBranch);
      setRecommendations(res.data ?? []);
    } catch (err: any) {
      setError(err.data?.title ?? 'Failed to load insights.');
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleGenerate = async () => {
    if (!selectedBranch) return;
    setGenerating(true);
    setError(null);
    try {
      const res: any = await optimizationApi.analyze(selectedBranch);
      setRecommendations(res.data ?? []);
    } catch (err: any) {
      setError(err.data?.title ?? 'Failed to generate insights.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAction = async (rec: any, action: string) => {
    try {
      if (action === 'Approve') {
        const res: any = await optimizationApi.approve(rec.recommendationId);
        const updatedRec = res.data || res;
        setRecommendations(prev => prev.map(r => r.recommendationId === rec.recommendationId ? updatedRec : r));
      } else if (action === 'Reject') {
        const reason = window.prompt("Reason for rejection:");
        if (!reason) return;
        await optimizationApi.reject(rec.recommendationId, reason);
        setRecommendations(prev => prev.filter(r => r.recommendationId !== rec.recommendationId));
      }
    } catch (err: any) {
      alert('Failed to apply action: ' + (err.data?.title ?? err.message));
    }
  };

  if (branches.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl overflow-hidden mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 border-b border-[var(--border)] gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-[var(--text-h)]">
            <Sparkles className="text-purple-500" size={20} />
            AI Optimization Insights
          </div>
          <p className="text-xs text-[var(--text)] mt-1">
            Semantic Kernel powered inventory recommendations
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full sm:w-auto">
          <select
            className="flex-1 sm:flex-none border border-[var(--border)] bg-gray-50 dark:bg-gray-800 text-[var(--text)] text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/50"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            {branches.map(b => (
              <option key={b.branchId} value={b.branchId}>{b.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="flex-1 sm:flex-none px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            onClick={handleGenerate}
            disabled={generating || loading || !selectedBranch}
          >
            {generating ? 'Analyzing...' : 'Generate Insights'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-5"><CardSkeleton /></div>
      ) : error ? (
        <div className="p-4 m-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
      ) : recommendations.length === 0 ? (
        <div className="py-12 px-4 text-center">
          <p className="text-sm text-[var(--text)]">
            No pending recommendations for this branch.
          </p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-gray-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            onClick={handleGenerate}
            disabled={generating}
          >
            Run Analysis Now
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase tracking-wider text-[var(--text)]">
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Product</th>
                <th className="p-4 font-semibold">Recommendation & Reasoning</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-h)]">
              {recommendations.map(rec => (
                <tr key={rec.recommendationId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant={rec.recommendationType === 'Transfer' ? 'info' : 'warning'}>
                        {rec.recommendationType}
                      </Badge>
                      <Badge variant={rec.priority === 'Critical' ? 'danger' : 'default'}>
                        {rec.priority || 'High'}
                      </Badge>
                    </div>
                  </td>
                  <td className="p-4">
                    <strong className="font-semibold block mb-1">{rec.product?.name ?? 'Unknown'}</strong>
                    <span className="text-xs text-[var(--text)]">Issue: {rec.issueType || 'LowStock'}</span>
                  </td>
                  <td className="p-4">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-semibold text-sm">Suggest {rec.suggestedQuantity} units</span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                        {Math.round(rec.confidenceScore * 100)}% Match
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text)] max-w-md">{rec.reasoning}</p>
                  </td>
                  <td className="p-4 text-right">
                    {rec.status === 'TransferCreated' ? (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-semibold text-green-600 dark:text-green-400">Transfer Created</span>
                        <a href="/transfers" className="text-xs font-medium text-black dark:text-purple-400 hover:underline">View Transfers &rarr;</a>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors"
                          onClick={() => handleAction(rec, 'Approve')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-xs font-medium rounded transition-colors"
                          onClick={() => handleAction(rec, 'Reject')}
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
