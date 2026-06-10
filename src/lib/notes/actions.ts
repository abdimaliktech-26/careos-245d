'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'

export async function createShiftNote(_prev: { error: string | null; success: string | null }, formData: FormData) {
  const { user } = await getSession()
  if (!user?.organizationId) return { error: 'Not authenticated', success: null }

  const supabase = await createClient()

  const clientId   = formData.get('clientId') as string
  const visitDate  = formData.get('visitDate') as string
  const startTime  = formData.get('startTime') as string
  const endTime    = formData.get('endTime') as string
  const serviceType = formData.get('serviceType') as string
  const moodRating = formData.get('moodRating') as string
  const narrative  = formData.get('narrative') as string
  const goals      = formData.get('goalsAddressed') as string
  const activities = formData.get('activities') as string

  if (!clientId || !visitDate || !startTime || !endTime || !serviceType || !narrative) {
    return { error: 'Client, date, times, service type, and narrative are required.', success: null }
  }

  const { error } = await supabase.from('shift_notes').insert({
    organization_id: user.organizationId,
    client_id:       clientId,
    staff_id:        user.id,
    staff_name:      user.fullName,
    visit_date:      visitDate,
    start_time:      startTime,
    end_time:        endTime,
    service_type:    serviceType,
    mood_rating:     moodRating ? parseInt(moodRating) : null,
    narrative,
    goals_addressed: goals || null,
    activities:      activities || null,
  })

  if (error) return { error: error.message, success: null }

  revalidatePath('/notes')
  return { error: null, success: 'Shift note saved.' }
}

export async function updateShiftNote(_prev: { error: string | null; success: string | null }, formData: FormData) {
  const { user } = await getSession()
  if (!user?.organizationId) return { error: 'Not authenticated', success: null }

  const supabase = await createClient()

  const noteId     = formData.get('noteId') as string
  const clientId   = formData.get('clientId') as string
  const visitDate  = formData.get('visitDate') as string
  const startTime  = formData.get('startTime') as string
  const endTime    = formData.get('endTime') as string
  const serviceType = formData.get('serviceType') as string
  const moodRating = formData.get('moodRating') as string
  const narrative  = formData.get('narrative') as string
  const goals      = formData.get('goalsAddressed') as string
  const activities = formData.get('activities') as string

  if (!noteId || !clientId || !visitDate || !startTime || !endTime || !serviceType || !narrative) {
    return { error: 'Client, date, times, service type, and narrative are required.', success: null }
  }

  const { error } = await supabase
    .from('shift_notes')
    .update({
      client_id:       clientId,
      visit_date:      visitDate,
      start_time:      startTime,
      end_time:        endTime,
      service_type:    serviceType,
      mood_rating:     moodRating ? parseInt(moodRating) : null,
      narrative,
      goals_addressed: goals || null,
      activities:      activities || null,
    })
    .eq('id', noteId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message, success: null }

  revalidatePath('/notes')
  return { error: null, success: 'Shift note updated.' }
}

export async function deleteShiftNote(id: string) {
  const { user } = await getSession()
  if (!user?.organizationId) return { error: 'Not authenticated' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('shift_notes')
    .delete()
    .eq('id', id)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }
  revalidatePath('/notes')
  return { error: null }
}
