import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  hasError?: boolean
}

export function Input({ hasError = false, className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
        hasError
          ? 'border-red-400 focus:ring-red-400'
          : 'border-gray-300 focus:ring-blue-500'
      } ${className}`}
      {...props}
    />
  )
}
