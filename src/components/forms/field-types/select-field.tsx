import type { FormField } from '@/types/forms'

type SelectFieldProps = {
  field: FormField
  value: string
  onChange: (value: string) => void
}

export function SelectField({ field, value, onChange }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={field.id} className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={field.id}
        name={field.id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select…</option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}
