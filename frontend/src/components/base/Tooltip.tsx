import React, { useState } from 'react'
import { cn } from '../../utils/cn'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)

  const sideStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  }

  return (
    <div className="relative inline-flex">
      {React.cloneElement(children, {
        onMouseEnter: () => setIsVisible(true),
        onMouseLeave: () => setIsVisible(false),
        onFocus: () => setIsVisible(true),
        onBlur: () => setIsVisible(false),
      })}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-1.5',
            'text-xs font-medium text-white',
            'bg-slate-900 dark:bg-slate-700',
            'rounded-lg shadow-lg',
            'whitespace-nowrap',
            'pointer-events-none',
            'animate-in fade-in-0 zoom-in-95',
            sideStyles[side],
            className
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
