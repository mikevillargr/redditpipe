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
            'placeholder:text-[#94a3b8]',
            'focus:outline-none focus:ring-2 focus:ring-offset-2',
            // Light mode
            'bg-[#ffffff] text-[#0f172a]',
            'border-[#e2e8f0]',
            'hover:border-[#cbd5e1]',
            'focus:border-[#f97316] focus:ring-[#f97316] focus:ring-offset-[#ffffff]',
            // Dark mode
            'dark:bg-[#1e293b] dark:text-[#f1f5f9]',
            'dark:border-[#334155]',
            'dark:hover:border-[#475569]',
            'dark:focus:border-[#f97316] dark:focus:ring-offset-[#0f172a]',
            // Error state
            error && 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]',
            // Disabled state
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[#f1f5f9] dark:disabled:bg-[#0f172a]',
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
