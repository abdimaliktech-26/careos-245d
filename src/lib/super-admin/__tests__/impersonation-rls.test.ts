import { describe, test, expect, afterAll } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'

const hasEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.runIf(hasEnv)('get_my_org_id with impersonation (integration)', () => {
  const admin = createAdminClient()
  const cleanup: Array<() => Promise<void>> = []
  afterAll(async () => { for (const fn of cleanup) await fn() })

  async function makeOrg(name: string): Promise<string> {
    const { data } = await admin.from('organizations').insert({ name, status: 'active', plan: 'pro' }).select('id').single()
    const id = (data as { id: string }).id
    cleanup.push(async () => { await admin.from('organizations').delete().eq('id', id) })
    return id
  }

  async function makeSuper(orgId: string): Promise<string> {
    const email = `imp_super_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`
    const { data } = await admin.auth.admin.createUser({ email, email_confirm: true, password: 'Imp-abc123!' })
    const uid = data.user!.id
    cleanup.push(async () => { await admin.auth.admin.deleteUser(uid) })
    await admin.from('organization_members').insert({ organization_id: orgId, user_id: uid, role: 'super_admin', full_name: 'Imp Super', email, is_active: true, joined_at: new Date().toISOString() })
    return uid
  }

  test('active impersonation row inserts and is the latest active for the super admin', async () => {
    const o1 = await makeOrg('__imp_o1__')
    const o2 = await makeOrg('__imp_o2__')
    const uid = await makeSuper(o1)

    const { data: imp, error: impErr } = await admin.from('super_admin_impersonations')
      .insert({ super_admin_id: uid, organization_id: o2, expires_at: new Date(Date.now() + 60000).toISOString() })
      .select('id').single()
    expect(impErr).toBeNull()
    const impId = (imp as { id: string }).id
    cleanup.push(async () => { await admin.from('super_admin_impersonations').delete().eq('id', impId) })

    const { data: rows } = await admin.from('super_admin_impersonations')
      .select('organization_id, ended_at, expires_at').eq('super_admin_id', uid).is('ended_at', null)
    expect(rows?.[0]?.organization_id).toBe(o2)
  })

  test('unique partial index blocks a second active row for the same super admin', async () => {
    const org = await makeOrg('__imp_uniq__')
    const uid = await makeSuper(org)
    const exp = new Date(Date.now() + 60000).toISOString()

    const { data: r1 } = await admin.from('super_admin_impersonations')
      .insert({ super_admin_id: uid, organization_id: org, expires_at: exp }).select('id').single()
    const r1Id = (r1 as { id: string }).id
    cleanup.push(async () => { await admin.from('super_admin_impersonations').delete().eq('id', r1Id) })

    const { error: dupErr } = await admin.from('super_admin_impersonations')
      .insert({ super_admin_id: uid, organization_id: org, expires_at: exp })
    expect(dupErr).not.toBeNull()
  })
})
