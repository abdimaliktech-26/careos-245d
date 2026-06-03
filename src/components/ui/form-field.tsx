import type { InputHTMLAttributes } from 'react'
import { Input } from './input'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  name: string
  error?: string
}

export function FormField({ label, name, error, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {inputProps.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input id={name} name={name} hasError={!!error} {...inputProps} />
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
