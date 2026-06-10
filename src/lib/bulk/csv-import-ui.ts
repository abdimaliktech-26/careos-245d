'use server'

import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

export type ColumnMapping = {
  csvColumn: string
  systemField: string
}

export type CsvValidationResult = {
  headers: string[]
  rowCount: number
  suggestions: ColumnMapping[]
  sampleRows: Record<string, string>[]
  errors: string[]
}

export type ImportResult = {
  imported: number
  errors: { row: number; message: string }[]
  skipped: number
}

const SYSTEM_FIELDS = [
  { key: 'legal_name', label: 'Legal Name', required: true },
  { key: 'preferred_name', label: 'Preferred Name', required: false },
  { key: 'date_of_birth', label: 'Date of Birth', required: true },
  { key: 'program', label: 'Program', required: true },
  { key: 'status', label: 'Status', required: false },
  { key: 'address', label: 'Address', required: false },
  { key: 'city', label: 'City', required: false },
  { key: 'state', label: 'State', required: false },
  { key: 'zip', label: 'ZIP Code', required: false },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'medicaid_number', label: 'Medicaid ID', required: false },
  { key: 'gender', label: 'Gender', required: false },
]

const FUZZY_MAP: Record<string, string> = {
  name: 'legal_name',
  'full name': 'legal_name',
  'client name': 'legal_name',
  'legal name': 'legal_name',
  dob: 'date_of_birth',
  'date of birth': 'date_of_birth',
  birthdate: 'date_of_birth',
  program: 'program',
  'medicaid id': 'medicaid_number',
  medicaid: 'medicaid_number',
  phone: 'phone',
  'phone number': 'phone',
  email: 'email',
  'email address': 'email',
  address: 'address',
  city: 'city',
  state: 'state',
  zip: 'zip',
  'zip code': 'zip',
  gender: 'gender',
  status: 'status',
}

export async function validateCsvPreview(headers: string[], rows: Record<string, string>[]): Promise<CsvValidationResult> {
  const suggestions: ColumnMapping[] = headers.map(header => {
    const normalized = header.toLowerCase().trim()
    const systemField = FUZZY_MAP[normalized]
    if (systemField) return { csvColumn: header, systemField }
    const fuzzyMatch = SYSTEM_FIELDS.find(f =>
      normalized.includes(f.label.toLowerCase()) || f.label.toLowerCase().includes(normalized)
    )
    return { csvColumn: header, systemField: fuzzyMatch?.key ?? '' }
  })

  const errors: string[] = []
  const requiredFields = SYSTEM_FIELDS.filter(f => f.required).map(f => f.key)
  const mappedFields = suggestions.filter(s => s.systemField).map(s => s.systemField)
  const missing = requiredFields.filter(r => !mappedFields.includes(r))
  if (missing.length > 0) {
    errors.push(`Missing required field mappings: ${missing.join(', ')}`)
  }

  return {
    headers,
    rowCount: rows.length,
    suggestions,
    sampleRows: rows.slice(0, 5),
    errors,
  }
}

export async function importClientsFromCsv(
  rows: Record<string, string>[],
  mapping: ColumnMapping[]
): Promise<ImportResult> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user?.organizationId || !['org_admin', 'super_admin'].includes(user.role)) {
    return { imported: 0, errors: [{ row: 0, message: 'Unauthorized' }], skipped: 0 }
  }

  const supabase = await createClient()
  const result: ImportResult = { imported: 0, errors: [], skipped: 0 }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const client: Record<string, unknown> = {
      organization_id: user.organizationId,
    }

    for (const m of mapping) {
      if (m.systemField) {
        client[m.systemField] = row[m.csvColumn] || null
      }
    }

    if (!client.legal_name || !client.date_of_birth || !client.program) {
      result.skipped++
      result.errors.push({ row: i + 1, message: 'Missing required fields (legal_name, date_of_birth, program)' })
      continue
    }

    client.status = client.status || 'active'

    const { error } = await supabase.from('clients').insert(client)
    if (error) {
      result.errors.push({ row: i + 1, message: error.message })
      result.skipped++
    } else {
      result.imported++
    }
  }

  revalidatePath('/clients')
  return result
}

export { SYSTEM_FIELDS }
