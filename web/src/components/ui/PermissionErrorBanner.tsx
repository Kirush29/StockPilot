import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface PermissionErrorBannerProps {
  message?: string;
  onDismiss?: () => void;
}

export const PermissionErrorBanner: React.FC<PermissionErrorBannerProps> = ({
  message = "You do not have permission to perform this action.",
  onDismiss,
}) => {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between text-red-800 dark:text-red-200 my-4 shadow-sm">
      <div className="flex items-center space-x-3">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 p-1 rounded-md transition-colors"
          aria-label="Dismiss message"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
