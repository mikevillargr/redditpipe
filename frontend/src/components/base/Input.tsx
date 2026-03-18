import React from 'react'
import { cn } from '../../utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    const inputId = React.useId()

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              'text-[#0f172a] dark:text-[#f1f5f9]'
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 rounded-lg',
            'border-2 transition-colors',
            'font-medium text-base',
            'placeholder:text-slate-400',
            'focus:outline-none focus:ring-2',
            // Light mode
            'bg-white text-slate-900',
            'border-slate-200',
            'hover:border-slate-300',
            'focus:border-orange-500 focus:ring-orange-500',
            // Dark mode
            'dark:bg-slate-800 dark:text-slate-100',
            'dark:border-slate-700',
            'dark:hover:border-slate-600',
            'dark:focus:border-orange-500',
            // Error state
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            // Disabled state
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-900',
            className
          )}
          {...props}
        />
        {(error || helperText) && (
          <p
            className={cn(
              'mt-1.5 text-sm',
              error ? 'text-[#ef4444]' : 'text-[#475569] dark:text-[#94a3b8]'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
