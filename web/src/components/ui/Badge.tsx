import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const baseClasses = 'px-2.5 py-0.5 rounded-full text-xs font-medium';

  const variantClasses = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    info: 'bg-gray-100 text-gray-800 dark:bg-blue-900 dark:text-blue-300',
    primary: 'bg-gray-100 text-gray-800 dark:bg-purple-900 dark:text-purple-300',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
