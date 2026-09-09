import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary:
    'bg-pine-700 text-white hover:bg-pine-600 shadow-sm shadow-pine-900/20 active:scale-[0.98] dark:text-pine-950 dark:hover:bg-pine-500',
  secondary:
    'bg-panel text-pine-800 border border-stone-line hover:bg-pine-50 active:scale-[0.98]',
  ghost: 'bg-transparent text-stone-muted hover:text-pine-800 hover:bg-panel/70',
  danger: 'bg-danger-soft text-danger hover:opacity-90 active:scale-[0.98]',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  children,
  fullWidth,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
