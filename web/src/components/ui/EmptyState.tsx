import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
}

export default function EmptyState({ title, description, icon: Icon = FileQuestion }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[var(--border)] rounded-xl bg-gray-50/50 dark:bg-[#1f2028]/50">
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
        <Icon size={32} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-h)] mb-1">{title}</h3>
      {description && <p className="text-sm text-[var(--text)] max-w-sm">{description}</p>}
    </div>
  );
}
