import { describe, test, expect, vi, beforeEach } from 'vitest'

vi.mock('../audit/record', () => ({
  recordValidationRun: vi.fn(async () => ({ id: 'run-1' })),
  patchRunAi: vi.fn(async () => {}),
}))
vi.mock('../ai/enrich', () => ({
  enrichRun: vi.fn(async () => ({ summary: 'ok', anomalies: [], modelId: 'test-model' })),
}))

import { runIntakeValidation } from '../pipeline'
import { recordValidationRun } from '../audit/record'

const baseInput = {
  subjectId: 's1', clientId: 'c1',
  fields: [{ field_key: 'dob', label: 'DOB', is_required: true, conditional_on: null, conditional_value: null }],
  formData: { dob: '' },
  eligibility: { program: 'ICS', waiver_type: 'CADI', county_of_service: 'Hennepin', service_start_date: '2025-01-01', guardianship_status: 'self', guardian_name: null, today: '2026-06-17' },
  router: { waiver_type: 'CADI', requested_service: null, current_program: null },
}

describe('runIntakeValidation', () => {
  beforeEach(() => vi.clearAllMocks())

  test('fails when required field missing and records a run', async () => {
    const result = await runIntakeValidation(baseInput, { organizationId: 'org1', userId: null })
    expect(result.verdict).toBe('fail')
    expect(recordValidationRun).toHaveBeenCalledOnce()
    expect(result.runId).toBe('run-1')
  })

  test('passes with complete valid data', async () => {
    const result = await runIntakeValidation({ ...baseInput, formData: { dob: '1990-01-01' } }, { organizationId: 'org1', userId: null })
    expect(result.verdict).toBe('pass')
  })
})
