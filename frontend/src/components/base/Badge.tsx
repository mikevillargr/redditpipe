import React from 'react'
import { cn } from '../../utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  children: React.ReactNode
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  const variantStyles = {
    default: cn(
      'bg-slate-100 text-slate-700 border-slate-200',
      'dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    ),
    success: cn(
      'bg-green-100 text-green-700 border-green-200',
      'dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
    ),
    warning: cn(
      'bg-yellow-100 text-yellow-700 border-yellow-200',
      'dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
    ),
    danger: cn(
      'bg-red-100 text-red-700 border-red-200',
      'dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
    ),
    info: cn(
      'bg-blue-100 text-blue-700 border-blue-200',
      'dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
    ),
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5',
        'text-xs font-medium',
        'border',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
