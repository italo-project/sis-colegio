import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
        )}
        <input
          ref={ref}
          {...props}
          className={`w-full px-4 py-2.5 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all ${
            error ? 'border-red-300' : 'border-gray-200 shadow-sm'
          } ${className}`}
        />
        {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500 mt-1.5">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';