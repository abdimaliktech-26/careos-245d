import { describe, test, expect, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.runIf(hasEnv)('ai governance tables (integration)', () => {
  const admin = createAdminClient()
  const cleanup: Array<() => Promise<void>> = []
  afterAll(async () => { for (const fn of cleanup) await fn() })

  test('settings upsert + usage increment', { timeout: 30000 }, async () => {
    const { data: org } = await admin.from('organizations').insert({ name: '__ai_gov_org__', status: 'active', plan: 'pro' }).select('id').single()
    const orgId = (org as { id: string }).id
    cleanup.push(async () => { await admin.from('organizations').delete().eq('id', orgId) })

    await admin.from('org_ai_settings').insert({ organization_id: orgId, ai_enabled: false, monthly_limit: 5 })
    const { data: settings } = await admin.from('org_ai_settings').select('ai_enabled, monthly_limit').eq('organization_id', orgId).maybeSingle()
    expect((settings as { ai_enabled: boolean }).ai_enabled).toBe(false)

    const { data: c1 } = await admin.rpc('increment_ai_usage', { p_org: orgId, p_period: '2026-06' })
    const { data: c2 } = await admin.rpc('increment_ai_usage', { p_org: orgId, p_period: '2026-06' })
    expect(c2).toBe((c1 as number) + 1)
  })
})
