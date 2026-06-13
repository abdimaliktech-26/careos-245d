'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { expandRecurrence } from './recurring'
import { detectConflicts } from './conflicts'

type ActionResult = { error: string | null; success: string | null; conflicts?: Array<{ date: string; message: string }> }

export async function createScheduleEntry(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user } = await getSession()
  if (!user?.organizationId) return { error: 'Not authenticated', success: null }

  const supabase = await createClient()

  const clientId      = formData.get('clientId') as string
  const staffName     = formData.get('staffName') as string
  const scheduledDate = formData.get('scheduledDate') as string
  const startTime     = formData.get('startTime') as string
  const endTime       = formData.get('endTime') as string
  const serviceType   = formData.get('serviceType') as string
  const notes         = formData.get('notes') as string
  const recurrence    = (formData.get('recurrence') as string) ?? 'none'
  const createEvv     = formData.get('createEvv') === 'true'

  if (!clientId || !scheduledDate || !startTime || !endTime || !serviceType) {
    return { error: 'Client, date, times, and service type are required.', success: null }
  }

  const dates = expandRecurrence(scheduledDate, recurrence as never, 12)

  // Check conflicts for each date
  const allConflicts: Array<{ date: string; message: string }> = []
  if (staffName) {
    const { data: existing } = await supabase
      .from('schedules')
      .select('id, staff_name, scheduled_date, start_time, end_time')
      .eq('organization_id', user.organizationId)
      .in('scheduled_date', dates)
      .not('status', 'eq', 'cancelled')

    for (const date of dates) {
      const conflicts = detectConflicts(staffName, date, startTime, endTime, existing ?? [])
      allConflicts.push(...conflicts.map((c) => ({ date: c.date, message: c.message })))
    }
  }

  // Insert schedules
  const inserts = dates.map((date) => ({
    organization_id: user.organizationId,
    client_id: clientId,
    staff_name: staffName || null,
    scheduled_date: date,
    start_time: startTime,
    end_time: endTime,
    service_type: serviceType,
    status: 'scheduled' as const,
    notes: notes || null,
    create_evv: createEvv,
  }))

  const { error } = await supabase.from('schedules').insert(inserts)
  if (error) return { error: error.message, success: null }

  // Auto-create EVV visits if enabled
  if (createEvv) {
    const evvInserts = dates.map((date) => ({
      organization_id: user.organizationId,
      client_id: clientId,
      service_name: serviceType,
      service_date: date,
      scheduled_start: `${date}T${startTime}:00`,
      scheduled_end: `${date}T${endTime}:00`,
      status: 'scheduled' as const,
    }))

    const { error: evvErr } = await supabase.from('evv_visits').insert(evvInserts)
    if (evvErr) console.error('Failed to create EVV visits:', evvErr.message)
  }

  revalidatePath('/schedule')
  revalidatePath('/evv')
  revalidatePath('/billing-readiness')

  const count = dates.length
  const msg = count === 1
    ? 'Shift scheduled.'
    : `${count} shifts scheduled (${recurrence.replace(/_/g, ' ')}).`

  return {
    error: null,
    success: msg,
    conflicts: allConflicts.length > 0 ? allConflicts : undefined,
  }
}

export async function updateScheduleStatus(id: string, status: string) {
  const { user } = await getSession()
  if (!user?.organizationId) return { error: 'Not authenticated' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('schedules')
    .update({ status })
    .eq('id', id)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }
  revalidatePath('/schedule')
  return { error: null }
}

export async function getScheduleEntry(id: string) {
  const { user } = await getSession()
  if (!user?.organizationId) return { error: 'Not authenticated', data: null }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('schedules')
    .select('id, client_id, staff_name, scheduled_date, start_time, end_time, service_type, status, notes, create_evv')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (error) return { error: error.message, data: null }
  return { error: null, data }
}

export async function updateScheduleEntry(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { user } = await getSession()
  if (!user?.organizationId) return { error: 'Not authenticated', success: null }

  const supabase = await createClient()

  const entryId      = formData.get('entryId') as string
  const clientId     = formData.get('clientId') as string
  const staffName    = formData.get('staffName') as string
  const scheduledDate = formData.get('scheduledDate') as string
  const startTime    = formData.get('startTime') as string
  const endTime      = formData.get('endTime') as string
  const serviceType  = formData.get('serviceType') as string
  const notes        = formData.get('notes') as string
  const status       = (formData.get('status') as string) ?? 'scheduled'

  if (!entryId || !clientId || !scheduledDate || !startTime || !endTime || !serviceType) {
    return { error: 'Client, date, times, and service type are required.', success: null }
  }

  const { error } = await supabase
    .from('schedules')
    .update({
      client_id: clientId,
      staff_name: staffName || null,
      scheduled_date: scheduledDate,
      start_time: startTime,
      end_time: endTime,
      service_type: serviceType,
      status,
      notes: notes || null,
    })
    .eq('id', entryId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message, success: null }

  revalidatePath('/schedule')
  revalidatePath('/evv')

  return { error: null, success: 'Schedule updated.' }
}

export async function deleteScheduleEntry(id: string) {
  const { user } = await getSession()
  if (!user?.organizationId) return { error: 'Not authenticated' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }
  revalidatePath('/schedule')
  revalidatePath('/evv')
  return { error: null }
}
