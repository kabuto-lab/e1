/**
 * Button Component
 * Lovnge Design System - Premium button styles
 */

import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className = '', children, disabled, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-semibold rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a]
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-95
    `;

    const variantStyles = {
      primary: `
        bg-gradient-to-r from-[#d4af37] to-[#b8941f]
        text-[#0a0a0a]
        hover:shadow-lg hover:shadow-[#d4af37]/20
        focus:ring-[#d4af37]
      `,
      secondary: `
        bg-transparent
        text-[#d4af37]
        border-2 border-[#d4af37]
        hover:bg-[#d4af37]/10
        focus:ring-[#d4af37]
      `,
      ghost: `
        bg-transparent
        text-[#a0a0a0]
        hover:text-white hover:bg-[#242424]
        focus:ring-[#666]
      `,
      danger: `
        bg-[#ef4444]
        text-white
        hover:bg-[#dc2626]
        focus:ring-[#ef4444]
      `,
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
