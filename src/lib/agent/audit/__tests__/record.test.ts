import { describe, test, expect, afterAll } from 'vitest'
import { recordValidationRun, patchRunAi } from '../record'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ValidationRun } from '../../types'

// Requires a reachable test/live Supabase (env from .env.local). Skips if unset.
const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const ORG = process.env.AGENT_TEST_ORG_ID // set to a real org id for this test

const run: ValidationRun = {
  subjectType: 'intake_form', subjectId: '00000000-0000-0000-0000-000000000001',
  clientId: null, trigger: 'form_submitted', verdict: 'warn',
  checks: [{ key: 'required_fields', label: 'Required fields complete', status: 'warn' }],
  flags: [{ code: 'x', severity: 'low', message: 'test' }],
  programRecommendation: null,
}

describe.runIf(hasEnv && Boolean(ORG))('recordValidationRun (integration)', () => {
  const created: string[] = []
  afterAll(async () => {
    const admin = createAdminClient()
    for (const id of created) await admin.from('agent_validation_runs').delete().eq('id', id)
  })

  test('inserts a run and patches AI columns', async () => {
    const { id } = await recordValidationRun(run, { organizationId: ORG!, userId: null })
    created.push(id)
    expect(id).toBeTruthy()
    await patchRunAi(id, { ai_status: 'done', ai_summary: 'ok', ai_model: 'test-model' })
    const admin = createAdminClient()
    const { data } = await admin.from('agent_validation_runs').select('ai_status, ai_summary').eq('id', id).single()
    expect(data?.ai_status).toBe('done')
  })
})
