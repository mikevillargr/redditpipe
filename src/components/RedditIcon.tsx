import React from 'react'
interface RedditIconProps {
  size?: number
  /** 'color' = full orange+white brand icon, 'white' = white alien only (for colored backgrounds), 'current' = uses currentColor */
  variant?: 'color' | 'white' | 'mono'
  style?: React.CSSProperties
  className?: string
}
export function RedditIcon({
  size = 20,
  variant = 'color',
  style,
  className,
}: RedditIconProps) {
  if (variant === 'white') {
    // White alien only — for use inside colored avatar circles
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={style}
        className={className}
      >
        <path
          fill="white"
          d="M16.67 10a1.46 1.46 0 0 0-2.47-1.05 7.12 7.12 0 0 0-3.85-1.22l.65-3.08 2.13.45a1.01 1.01 0 1 0 1.03-.98 1.01 1.01 0 0 0-.96.68l-2.38-.5a.16.16 0 0 0-.19.12l-.73 3.44a7.14 7.14 0 0 0-3.89 1.22 1.46 1.46 0 1 0-1.61 2.39c.02.15.03.3.03.44 0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06c0-.15-.01-.3-.03-.44A1.46 1.46 0 0 0 16.67 10zM7.27 11a1.01 1.01 0 1 1 1.01 1.01A1.01 1.01 0 0 1 7.27 11zm5.58 2.71a3.58 3.58 0 0 1-2.85.86 3.58 3.58 0 0 1-2.85-.86.23.23 0 0 1 .33-.33 3.15 3.15 0 0 0 2.52.71 3.15 3.15 0 0 0 2.52-.71.23.23 0 0 1 .33.33zm-.22-1.71a1.01 1.01 0 1 1 1.01-1.01 1.01 1.01 0 0 1-1.01 1.01z"
        />
      </svg>
    )
  }
  if (variant === 'mono') {
    // Single-color alien for use with currentColor (e.g. in nav icons)
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 20 20"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        style={style}
        className={className}
      >
        <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm6.67 10a1.46 1.46 0 0 1-.64 1.2c.02.15.03.3.03.44 0 2.24-2.61 4.06-5.83 4.06S4.4 13.88 4.4 11.64c0-.15.01-.3.03-.44A1.46 1.46 0 1 1 6.04 8.81a7.14 7.14 0 0 1 3.89-1.22l.73-3.44a.16.16 0 0 1 .19-.12l2.38.5a1.01 1.01 0 1 1-.07.98l-2.13-.45-.65 3.08a7.12 7.12 0 0 1 3.85 1.22A1.46 1.46 0 0 1 16.67 10zM7.27 11a1.01 1.01 0 1 0 1.01-1.01A1.01 1.01 0 0 0 7.27 11zm5.36 1.71a3.15 3.15 0 0 1-2.52.71 3.15 3.15 0 0 1-2.52-.71.23.23 0 0 0-.33.33 3.58 3.58 0 0 0 2.85.86 3.58 3.58 0 0 0 2.85-.86.23.23 0 0 0-.33-.33zm.22-1.71a1.01 1.01 0 1 0-1.01 1.01 1.01 1.01 0 0 0 1.01-1.01z" />
      </svg>
    )
  }
  // Full color brand icon (orange circle + white alien)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={className}
    >
      <circle cx="10" cy="10" r="10" fill="#FF4500" />
      <path
        fill="white"
        d="M16.67 10a1.46 1.46 0 0 0-2.47-1.05 7.12 7.12 0 0 0-3.85-1.22l.65-3.08 2.13.45a1.01 1.01 0 1 0 1.03-.98 1.01 1.01 0 0 0-.96.68l-2.38-.5a.16.16 0 0 0-.19.12l-.73 3.44a7.14 7.14 0 0 0-3.89 1.22 1.46 1.46 0 1 0-1.61 2.39c.02.15.03.3.03.44 0 2.24 2.61 4.06 5.83 4.06s5.83-1.82 5.83-4.06c0-.15-.01-.3-.03-.44A1.46 1.46 0 0 0 16.67 10zM7.27 11a1.01 1.01 0 1 1 1.01 1.01A1.01 1.01 0 0 1 7.27 11zm5.58 2.71a3.58 3.58 0 0 1-2.85.86 3.58 3.58 0 0 1-2.85-.86.23.23 0 0 1 .33-.33 3.15 3.15 0 0 0 2.52.71 3.15 3.15 0 0 0 2.52-.71.23.23 0 0 1 .33.33zm-.22-1.71a1.01 1.01 0 1 1 1.01-1.01 1.01 1.01 0 0 1-1.01 1.01z"
      />
    </svg>
  )
}
