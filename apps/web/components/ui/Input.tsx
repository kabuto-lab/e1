/**
 * Input Component
 * Lovnge Design System - Premium form input styles
 */

import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, size = 'md', className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const baseStyles = `
      w-full
      bg-[#0a0a0a]
      border rounded-lg
      text-white
      placeholder-gray-500
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
      transition-colors duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const stateStyles = error
      ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
      : 'border-white/[0.06] focus:border-[#d4af37] focus:ring-[#d4af37]/20';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-400 mb-1 uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseStyles} ${sizeStyles[size]} ${stateStyles} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-[#ef4444]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea Component
 */
export const Textarea = forwardRef<HTMLTextAreaElement, InputProps & { rows?: number }>(
  ({ label, error, helperText, rows = 4, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-400 mb-1 uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref as any}
          id={inputId}
          rows={rows}
          className={`
            w-full
            bg-[#0a0a0a]
            border border-white/[0.06] rounded-lg
            text-white
            placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-[#d4af37]/20 focus:border-[#d4af37]
            transition-colors duration-200
            resize-none
            disabled:opacity-50 disabled:cursor-not-allowed
            px-4 py-2 text-base
            ${error ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]' : ''}
            ${className}
          `}
          {...(props as any)}
        />
        {error && (
          <p className="mt-1 text-sm text-[#ef4444]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

/**
 * Select Component
 */
export const Select = forwardRef<HTMLSelectElement, InputProps>(
  ({ label, error, helperText, size = 'md', className = '', id, children, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const baseStyles = `
      w-full
      bg-[#0a0a0a]
      border rounded-lg
      text-white
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
      transition-colors duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
      cursor-pointer
    `;

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const stateStyles = error
      ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]'
      : 'border-white/[0.06] focus:border-[#d4af37] focus:ring-[#d4af37]/20';

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-400 mb-1 uppercase tracking-wide"
          >
            {label}
          </label>
        )}
        <select
          ref={ref as any}
          id={inputId}
          className={`${baseStyles} ${sizeStyles[size]} ${stateStyles} ${className}`}
          {...(props as any)}
        >
          {children}
        </select>
        {error && (
          <p className="mt-1 text-sm text-[#ef4444]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
