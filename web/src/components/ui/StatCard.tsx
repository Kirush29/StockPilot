import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ElementType;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'default';
}

export default function StatCard({ label, value, subtext, icon: Icon, variant = 'default' }: StatCardProps) {
  const variantColors = {
    success: 'text-green-500 bg-green-50 dark:bg-green-900/20',
    warning: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    danger: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    info: 'text-black bg-gray-50 dark:bg-blue-900/20',
    primary: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    default: 'text-gray-500 bg-gray-50 dark:bg-gray-800',
  };

  const iconColorClass = variantColors[variant] || variantColors.default;

  return (
    <div className="bg-white dark:bg-[#1f2028] border border-[var(--border)] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-[var(--text)] mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-[var(--text-h)]">{value}</h3>
          {subtext && <p className="text-xs text-[var(--text)] mt-1">{subtext}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-lg ${iconColorClass}`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
