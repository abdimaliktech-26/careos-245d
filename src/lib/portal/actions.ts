'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'

type ActionResult = { error: string | null; data?: unknown }

export async function sendMessage(formData: FormData): Promise<ActionResult> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role)) {
    return { error: 'Unauthorized' }
  }

  const clientId = formData.get('clientId') as string
  const message = formData.get('message') as string
  if (!clientId || !message?.trim()) return { error: 'Client and message are required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('portal_messages').insert({
    organization_id: user.organizationId,
    client_id: clientId,
    sender_id: user.id,
    sender_name: user.fullName,
    sender_role: user.role,
    message: message.trim(),
    is_from_staff: true,
  })

  if (error) return { error: error.message }
  revalidatePath(`/clients/${clientId}/messages`)
  revalidatePath('/client/messages')
  return { error: null, data: { success: true } }
}

export async function sendClientReply(formData: FormData): Promise<ActionResult> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (user.role !== 'external_signer') return { error: 'Unauthorized' }

  const clientId = formData.get('clientId') as string
  const message = formData.get('message') as string
  if (!clientId || !message?.trim()) return { error: 'Message is required.' }

  const supabase = await createClient()
  const { error } = await supabase.from('portal_messages').insert({
    organization_id: user.organizationId,
    client_id: clientId,
    sender_id: user.id,
    sender_name: user.fullName,
    sender_role: 'client',
    message: message.trim(),
    is_from_staff: false,
  })

  if (error) return { error: error.message }
  revalidatePath('/client/messages')
  return { error: null, data: { success: true } }
}

export async function getMessages(clientId: string) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized', data: [] }

  const supabase = await createClient()

  if (user.role === 'external_signer') {
    const { data: links } = await supabase
      .from('signing_links')
      .select('packet_id, packets!inner(client_id)')
      .eq('signer_email', user.email)
      .limit(1)

    const link = (links ?? [])[0] as unknown as { packets?: { client_id: string } } | undefined
    if (!link?.packets?.client_id) return { error: 'No client linked', data: [] }
  }

  const { data, error } = await supabase
    .from('portal_messages')
    .select('*')
    .eq('client_id', clientId)
    .eq('organization_id', user.organizationId)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message, data: [] }
  return { error: null, data: data ?? [] }
}

export async function markAsRead(messageId: string): Promise<ActionResult> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('portal_messages')
    .update({ is_read: true })
    .eq('id', messageId)

  if (error) return { error: error.message }
  return { error: null }
}

export async function getServiceLogs(clientId: string, dateRange?: { from?: string; to?: string }) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized', data: [] }

  const supabase = await createClient()

  const dateFrom = dateRange?.from ?? new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)
  const dateTo = dateRange?.to ?? new Date().toISOString().slice(0, 10)

  const [shiftNotes, evvVisits] = await Promise.all([
    supabase
      .from('shift_notes')
      .select('id, visit_date, start_time, end_time, service_type, mood_rating, narrative, staff_name, created_at')
      .eq('client_id', clientId)
      .eq('organization_id', user.organizationId)
      .gte('visit_date', dateFrom)
      .lte('visit_date', dateTo)
      .order('visit_date', { ascending: false }),
    supabase
      .from('evv_visits')
      .select('id, service_date, scheduled_start, scheduled_end, actual_start, actual_end, service_name, status, check_in_method, check_out_method, notes')
      .eq('client_id', clientId)
      .eq('organization_id', user.organizationId)
      .gte('service_date', dateFrom)
      .lte('service_date', dateTo)
      .order('service_date', { ascending: false }),
  ])

  return {
    error: null,
    data: {
      shiftNotes: shiftNotes.data ?? [],
      evvVisits: evvVisits.data ?? [],
    },
  }
}

export async function getUpcomingSchedule(clientId: string) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized', data: [] }

  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('schedules')
    .select('id, scheduled_date, start_time, end_time, service_type, status, staff_name, notes')
    .eq('client_id', clientId)
    .eq('organization_id', user.organizationId)
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(30)

  if (error) return { error: error.message, data: [] }
  return { error: null, data: data ?? [] }
}
