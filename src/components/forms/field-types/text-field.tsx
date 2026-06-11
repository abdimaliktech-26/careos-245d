import type { FormField } from '@/types/forms'

type TextFieldProps = {
  field: FormField
  value: string
  onChange: (value: string) => void
}

const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

export function TextField({ field, value, onChange }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={field.id} className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      {field.type === 'textarea' ? (
        <textarea
          id={field.id}
          name={field.id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          className={inputClass}
        />
      ) : (
        <input
          id={field.id}
          name={field.id}
          type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className={inputClass}
        />
      )}
    </div>
  )
}
