'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'

type R = { error: string | null }

async function isSuper(): Promise<boolean> {
  const { user } = await getSession()
  return user?.role === 'super_admin'
}

/** Super-admin: enable/disable AI for any org (admin client; cross-org). */
export async function setOrgAiEnabled(orgId: string, enabled: boolean): Promise<R> {
  if (!(await isSuper())) return { error: 'Unauthorized' }
  const admin = createAdminClient()
  const { error } = await admin.from('org_ai_settings')
    .upsert({ organization_id: orgId, ai_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
  return { error: error?.message ?? null }
}

/** Super-admin: set the monthly AI usage cap for any org. */
export async function setOrgAiLimit(orgId: string, monthlyLimit: number): Promise<R> {
  if (!(await isSuper())) return { error: 'Unauthorized' }
  const admin = createAdminClient()
  const { error } = await admin.from('org_ai_settings')
    .upsert({ organization_id: orgId, monthly_limit: Math.max(0, Math.floor(monthlyLimit)), updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
  return { error: error?.message ?? null }
}
