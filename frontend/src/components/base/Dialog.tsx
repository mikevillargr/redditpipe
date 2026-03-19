import React from 'react'
import { Dialog as BaseDialog } from '@base-ui/react/dialog'
import { cn } from '../../utils/cn'
import { XIcon } from 'lucide-react'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </BaseDialog.Root>
  )
}

export interface DialogTriggerProps {
  children: React.ReactNode
}

export const DialogTrigger = ({ children }: DialogTriggerProps) => {
  return <BaseDialog.Trigger>{children}</BaseDialog.Trigger>
}

export interface DialogContentProps {
  children: React.ReactNode
  className?: string
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className }, ref) => {
    return (
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className={cn(
            'fixed inset-0 z-50',
            'bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <BaseDialog.Popup
          ref={ref}
          className={cn(
            'fixed left-[50%] top-[50%] z-50',
            'translate-x-[-50%] translate-y-[-50%]',
            'w-full max-w-lg',
            'rounded-lg border-2 shadow-lg',
            'bg-white border-slate-200',
            'dark:bg-slate-800 dark:border-slate-700',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            className
          )}
        >
          {children}
          <BaseDialog.Close
            className={cn(
              'absolute right-4 top-4',
              'rounded-lg p-1.5',
              'text-[#475569] hover:text-[#0f172a]',
              'dark:text-[#94a3b8] dark:hover:text-[#f1f5f9]',
              'hover:bg-[#f1f5f9] dark:hover:bg-[#334155]',
              'transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-[#f97316]'
            )}
          >
            <XIcon size={20} />
            <span className="sr-only">Close</span>
          </BaseDialog.Close>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    )
  }
)

DialogContent.displayName = 'DialogContent'

export interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

export const DialogHeader = ({ children, className }: DialogHeaderProps) => {
  return (
    <div className={cn('px-6 pt-6 pb-4', className)}>
      {children}
    </div>
  )
}

export interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

export const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ children, className }, ref) => {
    return (
      <BaseDialog.Title
        ref={ref}
        className={cn(
          'text-xl font-semibold',
          'text-[#0f172a] dark:text-[#f1f5f9]',
          className
        )}
      >
        {children}
      </BaseDialog.Title>
    )
  }
)

DialogTitle.displayName = 'DialogTitle'

export interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ children, className }, ref) => {
    return (
      <BaseDialog.Description
        ref={ref}
        className={cn(
          'text-sm mt-2',
          'text-[#475569] dark:text-[#94a3b8]',
          className
        )}
      >
        {children}
      </BaseDialog.Description>
    )
  }
)

DialogDescription.displayName = 'DialogDescription'

export interface DialogBodyProps {
  children: React.ReactNode
  className?: string
}

export const DialogBody = ({ children, className }: DialogBodyProps) => {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  )
}

export interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

export const DialogFooter = ({ children, className }: DialogFooterProps) => {
  return (
    <div className={cn('px-6 pb-6 pt-4 flex justify-end gap-2', className)}>
      {children}
    </div>
  )
}
