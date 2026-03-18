import React from 'react'
import { Select as BaseSelect } from '@base-ui/react/select'
import { cn } from '../../utils/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps {
  label?: string
  value?: string
  onChange?: (value: string | null) => void
  options: SelectOption[]
  placeholder?: string
  error?: string
  disabled?: boolean
  className?: string
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ label, value, onChange, options, placeholder, error, disabled, className }, ref) => {
    const selectId = React.useId()

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block text-sm font-medium mb-1.5',
              'text-[#0f172a] dark:text-[#f1f5f9]'
            )}
          >
            {label}
          </label>
        )}
        <BaseSelect.Root value={value} onValueChange={(val) => onChange?.(val)} disabled={disabled}>
          <BaseSelect.Trigger
            ref={ref}
            id={selectId}
            className={cn(
              'w-full px-3 py-2 rounded-lg',
              'border-2 transition-colors',
              'font-medium text-base text-left',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'flex items-center justify-between',
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
              'disabled:opacity-60 disabled:cursor-not-allowed',
              className
            )}
          >
            <BaseSelect.Value placeholder={placeholder} />
            <span className="ml-2">▼</span>
          </BaseSelect.Trigger>
          <BaseSelect.Portal>
            <BaseSelect.Positioner sideOffset={4}>
              <BaseSelect.Popup
                className={cn(
                  'min-w-[200px] rounded-lg border-2 shadow-lg',
                  'bg-[#ffffff] border-[#e2e8f0]',
                  'dark:bg-[#1e293b] dark:border-[#334155]',
                  'max-h-[300px] overflow-auto',
                  'py-1'
                )}
              >
                {options.map((option) => (
                  <BaseSelect.Item
                    key={option.value}
                    value={option.value}
                    className={cn(
                      'px-3 py-2 cursor-pointer transition-colors',
                      'text-[#0f172a] dark:text-[#f1f5f9]',
                      'hover:bg-[#f1f5f9] dark:hover:bg-[#334155]',
                      'data-[highlighted]:bg-[#f97316]/10 dark:data-[highlighted]:bg-[#f97316]/20',
                      'data-[selected]:bg-[#f97316] data-[selected]:text-white'
                    )}
                  >
                    {option.label}
                  </BaseSelect.Item>
                ))}
              </BaseSelect.Popup>
            </BaseSelect.Positioner>
          </BaseSelect.Portal>
        </BaseSelect.Root>
        {error && (
          <p className="mt-1.5 text-sm text-[#ef4444]">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
