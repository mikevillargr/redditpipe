import React from 'react'
import { cn } from '../../utils/cn'

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <label className={cn('relative inline-flex items-center cursor-pointer', className)}>
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            'w-11 h-6 rounded-full transition-colors',
            'peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500',
            'bg-slate-200 dark:bg-slate-700',
            'peer-checked:bg-orange-500',
            'peer-disabled:opacity-50 peer-disabled:cursor-not-allowed',
            'after:content-[""]',
            'after:absolute after:top-[2px] after:left-[2px]',
            'after:bg-white',
            'after:rounded-full after:h-5 after:w-5',
            'after:transition-transform',
            'peer-checked:after:translate-x-5'
          )}
        />
      </label>
    )
  }
)

Switch.displayName = 'Switch'
