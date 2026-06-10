import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger'

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:   'text-white disabled:opacity-50 shadow-sm',
  secondary: 'bg-white border border-[#C8A8E8] hover:bg-[#EDE0F8] text-[#3A2A4A] disabled:opacity-50',
  danger:    'bg-[#E8799E] hover:bg-[#D06085] text-white disabled:opacity-50',
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' },
  secondary: {},
  danger:    {},
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  children,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center px-4 py-2.5 rounded-full text-sm font-bold transition-opacity hover:opacity-90 cursor-pointer disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      style={{ ...VARIANT_STYLES[variant], ...style }}
      {...props}
    >
      {loading ? 'Loading…' : children}
    </button>
  )
}
