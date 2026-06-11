import type { FormField } from '@/types/forms'

type CheckboxFieldProps = {
  field: FormField
  value?: boolean | string[]
  checked?: boolean
  onChange: (value: boolean | string[]) => void
}

export function CheckboxField({ field, value, checked: checkedProp, onChange }: CheckboxFieldProps) {
  if (field.options?.length) {
    const selected = Array.isArray(value) ? value : []
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-foreground">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </legend>
        {field.options.map((option) => (
          <label key={option} className="flex items-start gap-2 cursor-pointer text-sm text-foreground">
            <input
              type="checkbox"
              name={field.id}
              value={option}
              checked={selected.includes(option)}
              onChange={(event) => {
                onChange(event.target.checked
                  ? [...selected, option]
                  : selected.filter((item) => item !== option)
                )
              }}
              className="mt-0.5 accent-blue-600"
            />
            <span>{option}</span>
          </label>
        ))}
      </fieldset>
    )
  }

  const checked = checkedProp ?? Boolean(value)
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        name={field.id}
        id={field.id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-blue-600"
      />
      <span className="text-sm text-foreground">{field.label}</span>
    </label>
  )
}
