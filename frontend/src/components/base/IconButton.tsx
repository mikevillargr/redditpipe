import React from 'react'
import { cn } from '../../utils/cn'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'default', size = 'md', className, children, ...props }, ref) => {
    const variantStyles = {
      default: cn(
        'bg-slate-100 text-slate-700',
        'hover:bg-slate-200',
        'active:bg-slate-300',
        'dark:bg-slate-800 dark:text-slate-300',
        'dark:hover:bg-slate-700',
        'dark:active:bg-slate-600'
      ),
      ghost: cn(
        'bg-transparent text-slate-600',
        'hover:bg-slate-100',
        'active:bg-slate-200',
        'dark:text-slate-400',
        'dark:hover:bg-slate-800',
        'dark:active:bg-slate-700'
      ),
    }

    const sizeStyles = {
      sm: 'p-1',
      md: 'p-2',
      lg: 'p-3',
    }

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          'rounded-lg',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-orange-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
