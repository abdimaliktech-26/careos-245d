'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { createClient } from '@/lib/supabase/server'
import { haversineDistance } from '@/lib/evv/geo'

type ActionState = { error: string | null; success?: string | null }

const evvSchema = z.object({
  clientId: z.string().uuid('Choose a client'),
  staffId: z.string().uuid('Choose staff').optional().or(z.literal('')),
  serviceName: z.string().min(2, 'Service name is required').max(140),
  serviceDate: z.string().min(1, 'Service date is required'),
  scheduledStart: z.string().optional().or(z.literal('')),
  scheduledEnd: z.string().optional().or(z.literal('')),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'missed', 'exception']),
  actualStart: z.string().optional().or(z.literal('')),
  actualEnd: z.string().optional().or(z.literal('')),
  checkInMethod: z.string().max(80).optional(),
  checkOutMethod: z.string().max(80).optional(),
  exceptionReason: z.string().max(1000).optional(),
  notes: z.string().max(1500).optional(),
})

function toTimestamp(date: string, time?: string) {
  if (!time) return null
  return new Date(`${date}T${time}`).toISOString()
}

function locationJson(label: string | null) {
  return label ? { source: 'manual', label } : null
}

export async function createEvvVisit(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }

  const parsed = evvSchema.safeParse({
    clientId: formData.get('clientId') as string,
    staffId: (formData.get('staffId') as string) || '',
    serviceName: formData.get('serviceName') as string,
    serviceDate: formData.get('serviceDate') as string,
    scheduledStart: (formData.get('scheduledStart') as string) || '',
    scheduledEnd: (formData.get('scheduledEnd') as string) || '',
    status: formData.get('status') as string,
    actualStart: (formData.get('actualStart') as string) || '',
    actualEnd: (formData.get('actualEnd') as string) || '',
    checkInMethod: (formData.get('checkInMethod') as string) || undefined,
    checkOutMethod: (formData.get('checkOutMethod') as string) || undefined,
    exceptionReason: (formData.get('exceptionReason') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('evv_visits').insert({
    organization_id: user.organizationId,
    client_id: parsed.data.clientId,
    staff_id: parsed.data.staffId || null,
    service_name: parsed.data.serviceName,
    service_date: parsed.data.serviceDate,
    scheduled_start: toTimestamp(parsed.data.serviceDate, parsed.data.scheduledStart),
    scheduled_end: toTimestamp(parsed.data.serviceDate, parsed.data.scheduledEnd),
    actual_start: toTimestamp(parsed.data.serviceDate, parsed.data.actualStart),
    actual_end: toTimestamp(parsed.data.serviceDate, parsed.data.actualEnd),
    check_in_method: parsed.data.checkInMethod || null,
    check_out_method: parsed.data.checkOutMethod || null,
    check_in_location: locationJson(parsed.data.checkInMethod || null),
    check_out_location: locationJson(parsed.data.checkOutMethod || null),
    status: parsed.data.status,
    exception_reason: parsed.data.exceptionReason || null,
    notes: parsed.data.notes || null,
  })

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'packet_updated',
    entityType: 'evv_visit',
    entityLabel: parsed.data.serviceName,
    details: { clientId: parsed.data.clientId, status: parsed.data.status },
  }).catch(() => null)

  revalidatePath('/evv')
  revalidatePath('/billing-readiness')
  revalidatePath('/admin/audit-assistant')
  return { error: null, success: 'EVV visit saved.' }
}

/**
 * Distance (meters) from the client's geocoded service address, when known.
 * Returns null when the client has no geofence anchor or the lookup fails
 * (e.g. migration not yet applied) — verification is best-effort, never blocking.
 */
async function distanceFromClientAddress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  organizationId: string,
  lat: number,
  lng: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from('evv_visits')
    .select('clients(geo_lat, geo_lng)')
    .eq('id', visitId)
    .eq('organization_id', organizationId)
    .single()
  if (error) return null

  const client = data?.clients as unknown as { geo_lat: number | null; geo_lng: number | null } | null
  if (client?.geo_lat == null || client?.geo_lng == null) return null
  return Math.round(haversineDistance({ lat, lng }, { lat: client.geo_lat, lng: client.geo_lng }))
}

export async function gpsCheckIn(
  visitId: string,
  lat: number,
  lng: number,
  accuracy: number,
  options: { faceVerified?: boolean } = {}
): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const distance = await distanceFromClientAddress(supabase, visitId, user.organizationId, lat, lng)

  const { error } = await supabase
    .from('evv_visits')
    .update({
      actual_start: new Date().toISOString(),
      check_in_method: 'gps',
      check_in_location: { source: 'gps', lat, lng, accuracy, timestamp: new Date().toISOString() },
      ...(distance != null ? { check_in_distance_m: distance } : {}),
      ...(options.faceVerified ? { face_verified: true } : {}),
      status: 'in_progress',
    })
    .eq('id', visitId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'packet_updated',
    entityType: 'evv_visit',
    entityLabel: 'GPS check-in',
    details: { visitId, accuracy, distanceM: distance, faceVerified: options.faceVerified ?? false },
  }).catch(() => null)

  revalidatePath('/evv')
  return { error: null, success: 'GPS check-in recorded.' }
}

export async function gpsCheckOut(visitId: string, lat: number, lng: number, accuracy: number): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const distance = await distanceFromClientAddress(supabase, visitId, user.organizationId, lat, lng)

  // Billable minutes from the actual clock-in to now
  const { data: existing } = await supabase
    .from('evv_visits')
    .select('actual_start')
    .eq('id', visitId)
    .eq('organization_id', user.organizationId)
    .single()
  const checkOutAt = new Date()
  const billableMinutes = existing?.actual_start
    ? Math.max(0, Math.round((checkOutAt.getTime() - new Date(existing.actual_start).getTime()) / 60000))
    : null

  const { error } = await supabase
    .from('evv_visits')
    .update({
      actual_end: checkOutAt.toISOString(),
      check_out_method: 'gps',
      check_out_location: { source: 'gps', lat, lng, accuracy, timestamp: checkOutAt.toISOString() },
      ...(distance != null ? { check_out_distance_m: distance } : {}),
      ...(billableMinutes != null ? { billable_minutes: billableMinutes } : {}),
      status: 'completed',
    })
    .eq('id', visitId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'packet_updated',
    entityType: 'evv_visit',
    entityLabel: 'GPS check-out',
    details: { visitId, accuracy, distanceM: distance, billableMinutes },
  }).catch(() => null)

  revalidatePath('/evv')
  return { error: null, success: 'GPS check-out recorded.' }
}
