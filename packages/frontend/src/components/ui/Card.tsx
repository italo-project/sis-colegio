import type { ReactNode } from 'react';

type StatCardProps = {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'purple';
  subtitle?: string;
};

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-purple-50 text-purple-600',
};

export const StatCard = ({ title, value, icon, color = 'blue', subtitle }: StatCardProps) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-apple hover:shadow-apple-hover transition-all duration-300 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
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
    <div className={`bg-white rounded-2xl shadow-apple border border-gray-100 overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
          {title && <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};