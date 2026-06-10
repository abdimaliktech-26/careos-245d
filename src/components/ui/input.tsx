import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean
}

export function Input({ hasError = false, className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors bg-white ${
        hasError
          ? 'border-red-400 focus:ring-red-200'
          : 'border-[#e5d8cd] focus:border-[#f37d6d] focus:ring-[#f37d6d]/20'
      } ${className}`}
      {...props}
    />
  )
}
