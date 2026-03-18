import React from 'react'
import { cn } from '../../utils/cn'
import { CheckCircleIcon, XCircleIcon, AlertTriangleIcon, InfoIcon } from 'lucide-react'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'error' | 'warning' | 'info'
  children: React.ReactNode
}

export function Alert({ variant = 'info', className, children, ...props }: AlertProps) {
  const variantStyles = {
    success: cn(
      'bg-green-50 border-green-200 text-green-800',
      'dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
    ),
    error: cn(
      'bg-red-50 border-red-200 text-red-800',
      'dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
    ),
    warning: cn(
      'bg-yellow-50 border-yellow-200 text-yellow-800',
      'dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400'
    ),
    info: cn(
      'bg-blue-50 border-blue-200 text-blue-800',
      'dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
    ),
  }

  const icons = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    warning: AlertTriangleIcon,
    info: InfoIcon,
  }

  const Icon = icons[variant]

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">{children}</div>
    </div>
  )
}
