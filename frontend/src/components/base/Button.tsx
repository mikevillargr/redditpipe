import React from 'react'
import { Button as BaseButton } from '@base-ui/react/button'
import { cn } from '../../utils/cn'

export interface ButtonProps extends React.ComponentPropsWithoutRef<typeof BaseButton> {
  variant?: 'primary' | 'secondary' | 'outlined' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth = false, className, children, ...props }, ref) => {
    const baseStyles = 'btn-base'
    
    const sizeStyles = {
      sm: 'btn-sm',
      md: 'btn-md',
      lg: 'btn-lg',
    }
    
    const variantStyles = {
      primary: cn(
        // Light mode: #f97316 (MUI primary)
        'bg-[#f97316] text-white font-medium',
        'hover:bg-[#ea580c]',
        'active:bg-[#c2410c]',
        'focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#f1f5f9]',
        // Dark mode: same color, different background
        'dark:bg-[#f97316] dark:hover:bg-[#ea580c] dark:active:bg-[#c2410c]',
        'dark:focus:ring-offset-[#0f172a]'
      ),
      secondary: cn(
        // Light mode: #3b82f6 (MUI secondary)
        'bg-[#3b82f6] text-white font-medium',
        'hover:bg-[#2563eb]',
        'active:bg-[#1d4ed8]',
        'focus:ring-[#3b82f6] focus:ring-offset-2 focus:ring-offset-[#f1f5f9]',
        // Dark mode: same color
        'dark:bg-[#3b82f6] dark:hover:bg-[#2563eb] dark:active:bg-[#1d4ed8]',
        'dark:focus:ring-offset-[#0f172a]'
      ),
      outlined: cn(
        // Light mode: #f97316 border and text
        'border-2 border-[#f97316] text-[#f97316] bg-transparent font-medium',
        'hover:bg-[#f97316]/10 hover:border-[#ea580c]',
        'active:bg-[#f97316]/20',
        'focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#f1f5f9]',
        // Dark mode: lighter for visibility
        'dark:border-[#f97316] dark:text-[#f97316]',
        'dark:hover:bg-[#f97316]/20 dark:hover:border-[#fb923c]',
        'dark:active:bg-[#f97316]/30',
        'dark:focus:ring-offset-[#0f172a]'
      ),
      ghost: cn(
        // Light mode: very dark text on light background for maximum contrast
        'text-[#1e293b] bg-transparent font-medium',
        'hover:bg-[#f1f5f9]',
        'active:bg-[#e2e8f0]',
        'focus:ring-[#94a3b8] focus:ring-offset-2 focus:ring-offset-[#ffffff]',
        // Dark mode: light text on dark background
        'dark:text-[#f1f5f9]',
        'dark:hover:bg-[#334155]',
        'dark:active:bg-[#475569]',
        'dark:focus:ring-offset-[#0f172a]'
      ),
      danger: cn(
        // Light mode: #ef4444 (MUI error)
        'bg-[#ef4444] text-white font-medium',
        'hover:bg-[#dc2626]',
        'active:bg-[#b91c1c]',
        'focus:ring-[#ef4444] focus:ring-offset-2 focus:ring-offset-[#f1f5f9]',
        // Dark mode: same color
        'dark:bg-[#ef4444] dark:hover:bg-[#dc2626] dark:active:bg-[#b91c1c]',
        'dark:focus:ring-offset-[#0f172a]'
      ),
    }
    
    const widthStyles = fullWidth ? 'w-full' : ''
    
    return (
      <BaseButton
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          widthStyles,
          className
        )}
        {...props}
      >
        {children}
      </BaseButton>
    )
  }
)

Button.displayName = 'Button'
