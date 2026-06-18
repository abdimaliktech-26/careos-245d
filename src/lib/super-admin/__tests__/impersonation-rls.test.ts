import { describe, test, expect, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.runIf(hasEnv)('get_my_org_id with impersonation (integration)', () => {
  const admin = createAdminClient()
  const cleanup: Array<() => Promise<unknown>> = []
  afterAll(async () => { for (const fn of cleanup) await fn() })

  test('active impersonation row inserts and is the latest active for the super admin', async () => {
    const { data: o1 } = await admin.from('organizations').insert({ name: '__imp_o1__', status: 'active', plan: 'pro' }).select('id').single()
    const { data: o2 } = await admin.from('organizations').insert({ name: '__imp_o2__', status: 'active', plan: 'pro' }).select('id').single()
    cleanup.push(() => admin.from('organizations').delete().eq('id', o1!.id))
    cleanup.push(() => admin.from('organizations').delete().eq('id', o2!.id))

    const email = `imp_super_${Date.now()}@example.com`
    const { data: au } = await admin.auth.admin.createUser({ email, email_confirm: true, password: 'Imp-abc123!', user_metadata: { organization_id: o1!.id } })
    cleanup.push(() => admin.auth.admin.deleteUser(au!.user.id))
    await admin.from('organization_members').insert({ organization_id: o1!.id, user_id: au!.user.id, role: 'super_admin', full_name: 'Imp Super', email, is_active: true, joined_at: new Date().toISOString() })

    const { data: imp, error: impErr } = await admin.from('super_admin_impersonations').insert({ super_admin_id: au!.user.id, organization_id: o2!.id, expires_at: new Date(Date.now() + 60000).toISOString() }).select('id').single()
    expect(impErr).toBeNull()
    cleanup.push(() => admin.from('super_admin_impersonations').delete().eq('id', imp!.id))

    const { data: rows } = await admin.from('super_admin_impersonations').select('organization_id, ended_at, expires_at').eq('super_admin_id', au!.user.id).is('ended_at', null)
    expect(rows?.[0]?.organization_id).toBe(o2!.id)
  })

  test('unique partial index blocks a second active row for the same super admin', async () => {
    const { data: org } = await admin.from('organizations').insert({ name: '__imp_uniq__', status: 'active', plan: 'pro' }).select('id').single()
    cleanup.push(() => admin.from('organizations').delete().eq('id', org!.id))
    const email = `imp_uniq_${Date.now()}@example.com`
    const { data: au } = await admin.auth.admin.createUser({ email, email_confirm: true, password: 'Imp-abc123!' })
    cleanup.push(() => admin.auth.admin.deleteUser(au!.user.id))

    const exp = new Date(Date.now() + 60000).toISOString()
    const { data: r1 } = await admin.from('super_admin_impersonations').insert({ super_admin_id: au!.user.id, organization_id: org!.id, expires_at: exp }).select('id').single()
    cleanup.push(() => admin.from('super_admin_impersonations').delete().eq('id', r1!.id))
    const { error: dupErr } = await admin.from('super_admin_impersonations').insert({ super_admin_id: au!.user.id, organization_id: org!.id, expires_at: exp })
    expect(dupErr).not.toBeNull()
  })
})
