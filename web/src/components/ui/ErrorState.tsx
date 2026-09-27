
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-[var(--border)] rounded-xl bg-red-50/30 dark:bg-red-900/10">
      <AlertCircle size={32} className="text-red-500 mb-3" />
      <h3 className="text-lg font-semibold text-[var(--text-h)] mb-2">Something went wrong</h3>
      <p className="text-sm text-red-600 dark:text-red-400 mb-5">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
}
