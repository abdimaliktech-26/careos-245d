import type { FormField } from '@/types/forms'

type YesNoFieldProps = {
  field: FormField
  value: string
  onChange: (value: string) => void
}

export function YesNoField({ field, value, onChange }: YesNoFieldProps) {
  const options = field.options?.length ? field.options : (field.required ? ['Yes', 'No'] : ['Yes', 'No', 'N/A'])
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium text-foreground">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </legend>
      {field.helpText && <p className="text-xs text-muted-foreground">{field.helpText}</p>}
      <div className="flex gap-4 mt-1">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name={field.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="accent-blue-600"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
