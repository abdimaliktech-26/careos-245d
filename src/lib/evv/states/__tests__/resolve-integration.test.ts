import { describe, test, expect, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.runIf(hasEnv)('evv_state_config (integration)', () => {
  const admin = hasEnv ? createAdminClient() : (null as unknown as ReturnType<typeof createAdminClient>)
  const cleanup: Array<() => Promise<void>> = []
  afterAll(async () => { for (const fn of cleanup) await fn() })

  test('config row stores state code', { timeout: 30000 }, async () => {
    const { data: org } = await admin.from('organizations').insert({ name: '__evv_state_org__', status: 'active', plan: 'pro' }).select('id').single()
    const orgId = (org as { id: string }).id
    cleanup.push(async () => { await admin.from('organizations').delete().eq('id', orgId) })
    const { error } = await admin.from('evv_state_config').insert({ organization_id: orgId, state_code: 'OH' })
    expect(error).toBeNull()
    const { data } = await admin.from('evv_state_config').select('state_code').eq('organization_id', orgId).maybeSingle()
    expect((data as { state_code: string }).state_code).toBe('OH')
  })
})
