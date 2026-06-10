import type { FormField } from '@/types/forms'

type DateFieldProps = {
  field: FormField
  value: string
  onChange: (value: string) => void
}

export function DateField({ field, value, onChange }: DateFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={field.id} className="text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={field.id}
        name={field.id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )
}
