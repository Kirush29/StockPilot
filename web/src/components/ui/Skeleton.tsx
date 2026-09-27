

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl p-5 shadow-sm animate-pulse">
      <div className="flex justify-between items-start">
        <div className="w-full">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mt-3"></div>
        </div>
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="w-full animate-pulse border border-[var(--border)] rounded-xl overflow-hidden bg-white dark:bg-[#1f2028]">
      <div className="h-12 bg-gray-100 dark:bg-gray-800 border-b border-[var(--border)]"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex p-4 border-b border-[var(--border)] last:border-0 gap-4">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  );
}
