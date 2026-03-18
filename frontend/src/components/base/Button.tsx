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
        'bg-primary-600 text-white font-medium',
        'hover:bg-primary-700',
        'active:bg-primary-800',
        'focus:ring-primary-500 focus:ring-offset-2',
        'dark:bg-primary-500 dark:hover:bg-primary-600 dark:active:bg-primary-700',
        'dark:focus:ring-offset-slate-900',
        'shadow-sm'
      ),
      secondary: cn(
        'bg-secondary-600 text-white font-medium',
        'hover:bg-secondary-700',
        'active:bg-secondary-800',
        'focus:ring-secondary-500 focus:ring-offset-2',
        'dark:bg-secondary-500 dark:hover:bg-secondary-600 dark:active:bg-secondary-700',
        'dark:focus:ring-offset-slate-900',
        'shadow-sm'
      ),
      outlined: cn(
        'border-2 border-primary-600 text-primary-700 bg-transparent font-medium',
        'hover:bg-primary-100 hover:border-primary-700',
        'active:bg-primary-200',
        'focus:ring-primary-500 focus:ring-offset-2',
        'dark:border-primary-400 dark:text-primary-400',
        'dark:hover:bg-primary-500/20 dark:hover:border-primary-300',
        'dark:active:bg-primary-500/30',
        'dark:focus:ring-offset-slate-900'
      ),
      ghost: cn(
        'text-slate-800 bg-transparent font-medium',
        'hover:bg-slate-100',
        'active:bg-slate-200',
        'focus:ring-slate-500 focus:ring-offset-2',
        'dark:text-slate-200',
        'dark:hover:bg-slate-800',
        'dark:active:bg-slate-700',
        'dark:focus:ring-offset-slate-900'
      ),
      danger: cn(
        'bg-danger-600 text-white font-medium',
        'hover:bg-danger-700',
        'active:bg-danger-800',
        'focus:ring-danger-500 focus:ring-offset-2',
        'dark:bg-danger-500 dark:hover:bg-danger-600 dark:active:bg-danger-700',
        'dark:focus:ring-offset-slate-900',
        'shadow-sm'
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
