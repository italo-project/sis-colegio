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
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        )}
        <input
          ref={ref}
          {...props}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors ${
            error ? 'border-red-300' : 'border-gray-300'
          } ${className}`}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';