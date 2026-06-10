export const FIELD_TYPES = [
  'text',
  'textarea',
  'date',
  'checkbox',
  'yesno',
  'radio',
  'select',
  'contact',
  'number',
  'phone',
  'email',
  'file',
  'signature',
  'section_header',
] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export type FormField = {
  id: string
  label: string
  type: FieldType
  required?: boolean
  options?: string[]
  placeholder?: string
  helpText?: string
  rows?: number
}

export type FormSection = {
  title: string
  description?: string
  fields: FormField[]
}

export type FormSchema = {
  title: string
  description?: string
  sections: FormSection[]
}

export type BuilderFieldOption = { label: string; value: string }

export type BuilderField = {
  id: string
  sectionLabel: string
  fieldKey: string
  label: string
  type: FieldType
  isRequired: boolean
  isHipaa: boolean
  options: BuilderFieldOption[]
  placeholder: string | null
  helpText: string | null
  sortOrder: number
  conditionalOn: string | null
  conditionalValue: string | null
}

export type BuilderTemplate = {
  id: string | null
  code: string
  name: string
  description: string
  packetTypes: string[]
  organizationId: string | null
  fields: BuilderField[]
}

export function isFormField(value: unknown): value is FormField {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.label === 'string' &&
    FIELD_TYPES.includes(v.type as FieldType)
  )
}

export function isFormSchema(value: unknown): value is FormSchema {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.title === 'string' && Array.isArray(v.sections)
}
