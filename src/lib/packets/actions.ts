'use server'

import { createClient as createServerClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function refreshOverduePackets(): Promise<ActionResult<number>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createServerClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('packets')
    .update({ status: 'overdue' })
    .eq('organization_id', user.organizationId)
    .lt('due_date', today)
    .in('status', ['not_started', 'in_progress', 'needs_signature'])
    .select('id')

  if (error) return { data: null, error: error.message }
  return { data: data?.length ?? 0, error: null }
}

export async function updatePacketStatus(packetId: string, newStatus: string): Promise<ActionResult<{ id: string }>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createServerClient()
  const { error } = await supabase
    .from('packets')
    .update({ status: newStatus })
    .eq('id', packetId)
    .eq('organization_id', user.organizationId)

  if (error) return { data: null, error: error.message }
  return { data: { id: packetId }, error: null }
}
