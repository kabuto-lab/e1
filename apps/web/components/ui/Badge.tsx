/**
 * Badge Component
 * Lovnge Design System - Status badges and labels
 */

import { HTMLAttributes, forwardRef } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'gold' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center
      font-semibold
      rounded-full
      text-uppercase tracking-wide
    `;

    const variantStyles = {
      default: `
        bg-[#242424]
        text-gray-400
        border border-[#333]
      `,
      gold: `
        bg-[#d4af37]/20
        text-[#d4af37]
        border border-[#d4af37]/30
      `,
      success: `
        bg-[#22c55e]/20
        text-[#22c55e]
        border border-[#22c55e]/30
      `,
      warning: `
        bg-[#eab308]/20
        text-[#eab308]
        border border-[#eab308]/30
      `,
      error: `
        bg-[#ef4444]/20
        text-[#ef4444]
        border border-[#ef4444]/30
      `,
      info: `
        bg-[#3b82f6]/20
        text-[#3b82f6]
        border border-[#3b82f6]/30
      `,
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

/**
 * Status Badge Component (with dot indicator)
 */
export const StatusBadge = forwardRef<HTMLSpanElement, BadgeProps & { dot?: boolean }>(
  ({ variant = 'default', size = 'md', className = '', dot = false, children, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center gap-1.5
      font-semibold
      rounded-full
      text-uppercase tracking-wide
    `;

    const variantStyles = {
      default: `bg-[#242424] text-gray-400`,
      gold: `bg-[#d4af37]/20 text-[#d4af37]`,
      success: `bg-[#22c55e]/20 text-[#22c55e]`,
      warning: `bg-[#eab308]/20 text-[#eab308]`,
      error: `bg-[#ef4444]/20 text-[#ef4444]`,
      info: `bg-[#3b82f6]/20 text-[#3b82f6]`,
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-3 py-1 text-sm',
      lg: 'px-4 py-1.5 text-base',
    };

    const dotSizes = {
      sm: 'w-1 h-1',
      md: 'w-1.5 h-1.5',
      lg: 'w-2 h-2',
    };

    const dotColors = {
      default: 'bg-gray-400',
      gold: 'bg-[#d4af37]',
      success: 'bg-[#22c55e]',
      warning: 'bg-[#eab308]',
      error: 'bg-[#ef4444]',
      info: 'bg-[#3b82f6]',
    };

    return (
      <span
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {dot && (
          <span className={`${dotSizes[size]} ${dotColors[variant]} rounded-full animate-pulse`} />
        )}
        {children}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
