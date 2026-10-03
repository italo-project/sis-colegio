import type { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'purple';
  subtitle?: string;
};

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
  purple: 'bg-purple-100 text-purple-600',
};

export const StatCard = ({ title, value, icon, color = 'blue', subtitle }: StatCardProps) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
};

type CardProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export const Card = ({ title, action, children, className = '' }: CardProps) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};