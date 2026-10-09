import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
}) => {
  const variantStyles = {
    primary: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border border-amber-200',
    danger: 'bg-rose-100 text-rose-800 border border-rose-200',
    info: 'bg-sky-100 text-sky-800 border border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs font-semibold rounded',
    md: 'px-2.5 py-1 text-xs font-semibold rounded-full',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium tracking-wide ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
};

export const getStatusBadgeVariant = (status: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
  const s = status.toUpperCase();
  if (['ACTIVE', 'PAID', 'APPROVED', 'RESOLVED', 'CLOSED', 'AVAILABLE'].includes(s)) return 'success';
  if (['PARTIAL', 'IN_PROGRESS', 'PENDING', 'CHECKED_OUT', 'INSIDE'].includes(s)) return 'warning';
  if (['OVERDUE', 'REJECTED', 'URGENT', 'HIGH', 'FULL', 'SUSPENDED'].includes(s)) return 'danger';
  if (['TRANSFERRED', 'MEDIUM', 'INFO'].includes(s)) return 'info';
  return 'neutral';
};
