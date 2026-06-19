'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { getStateProfile } from './registry'

type Result = { error: string | null }

const STARTER_CODES: Record<string, Array<{ service_name: string; procedure_code: string }>> = {
  MN: [{ service_name: 'Personal Care', procedure_code: 'T1019' }, { service_name: 'Homemaker', procedure_code: 'S5130' }],
  OH: [{ service_name: 'Personal Care', procedure_code: 'T1019' }],
  AZ: [{ service_name: 'Personal Care', procedure_code: 'T1019' }],
}

export async function setOrgState(stateCode: string): Promise<Result> {
  const { user, error } = await getSession()
  if (error || !user || !user.organizationId || !['org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }
  const code = stateCode.toUpperCase()
  if (!getStateProfile(code)) return { error: 'Unknown state' }

  const supabase = await createClient()
  const { error: e1 } = await supabase.from('evv_state_config')
    .upsert({ organization_id: user.organizationId, state_code: code, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
  if (e1) return { error: e1.message }

  // Seed starter service codes if none exist for this state yet.
  const { count } = await supabase.from('evv_service_codes').select('id', { count: 'exact', head: true })
    .eq('organization_id', user.organizationId).eq('state_code', code)
  if (!count) {
    const rows = (STARTER_CODES[code] ?? []).map((c) => ({
      organization_id: user.organizationId, state_code: code, ...c,
    }))
    if (rows.length) await supabase.from('evv_service_codes').insert(rows)
  }

  revalidatePath('/evv/settings')
  return { error: null }
}
