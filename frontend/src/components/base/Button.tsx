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
        'bg-primary-500 text-white',
        'hover:bg-primary-600',
        'active:bg-primary-700',
        'focus:ring-primary-500',
        'dark:bg-primary-500 dark:hover:bg-primary-600'
      ),
      secondary: cn(
        'bg-secondary-500 text-white',
        'hover:bg-secondary-600',
        'active:bg-secondary-700',
        'focus:ring-secondary-500',
        'dark:bg-secondary-500 dark:hover:bg-secondary-600'
      ),
      outlined: cn(
        'border-2 border-primary-500 text-primary-500 bg-transparent',
        'hover:bg-primary-50',
        'active:bg-primary-100',
        'focus:ring-primary-500',
        'dark:border-primary-500 dark:text-primary-500',
        'dark:hover:bg-primary-500/10',
        'dark:active:bg-primary-500/20'
      ),
      ghost: cn(
        'text-slate-700 bg-transparent',
        'hover:bg-slate-100',
        'active:bg-slate-200',
        'focus:ring-slate-500',
        'dark:text-slate-300',
        'dark:hover:bg-slate-800',
        'dark:active:bg-slate-700'
      ),
      danger: cn(
        'bg-danger-500 text-white',
        'hover:bg-danger-600',
        'active:bg-danger-700',
        'focus:ring-danger-500',
        'dark:bg-danger-500 dark:hover:bg-danger-600'
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
