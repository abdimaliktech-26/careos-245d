import { createClient } from '@/lib/supabase/server'

export type ImpersonationRow = {
  organization_id: string
  expires_at: string
  ended_at: string | null
  organizations: { name: string } | null
}

export type ActiveImpersonation = { orgId: string; orgName: string; expiresAt: string }

/** Pure: decide whether a row represents an active impersonation. */
export function parseActiveImpersonation(row: ImpersonationRow | null): ActiveImpersonation | null {
  if (!row) return null
  if (row.ended_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null
  return { orgId: row.organization_id, orgName: row.organizations?.name ?? 'Organization', expiresAt: row.expires_at }
}

/** Read the caller's active impersonation (RLS-scoped to own rows). */
export async function getActiveImpersonation(userId: string): Promise<ActiveImpersonation | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('super_admin_impersonations')
    .select('organization_id, expires_at, ended_at, organizations(name)')
    .eq('super_admin_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return parseActiveImpersonation((data as ImpersonationRow | null) ?? null)
}
