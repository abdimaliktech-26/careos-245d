import type { CheckResult, Flag } from '../types'

export type FormFieldDef = {
  field_key: string
  label: string
  is_required: boolean
  conditional_on: string | null
  conditional_value: string | null
}

function isVisible(field: FormFieldDef, data: Record<string, unknown>): boolean {
  if (!field.conditional_on) return true
  return String(data[field.conditional_on] ?? '') === String(field.conditional_value ?? '')
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/** Pure check: required, visible fields must be present in form_data. */
export function checkRequiredFields(
  fields: FormFieldDef[],
  data: Record<string, unknown>,
): { checks: CheckResult[]; flags: Flag[] } {
  const flags: Flag[] = []

  for (const field of fields) {
    if (!field.is_required) continue
    if (!isVisible(field, data)) continue
    if (isEmpty(data[field.field_key])) {
      flags.push({
        code: 'missing_required_field',
        severity: 'high',
        message: `Required field "${field.label}" is missing.`,
        field: field.field_key,
      })
    }
  }

  const checks: CheckResult[] = [{
    key: 'required_fields',
    label: 'Required fields complete',
    status: flags.length > 0 ? 'fail' : 'pass',
    detail: flags.length > 0 ? `${flags.length} missing` : undefined,
  }]

  return { checks, flags }
}
