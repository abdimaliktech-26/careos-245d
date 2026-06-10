'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { createClient } from '@/lib/supabase/server'

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

export async function gpsCheckIn(visitId: string, lat: number, lng: number, accuracy: number): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('evv_visits')
    .update({
      actual_start: new Date().toISOString(),
      check_in_method: 'gps',
      check_in_location: { source: 'gps', lat, lng, accuracy, timestamp: new Date().toISOString() },
      status: 'in_progress',
    })
    .eq('id', visitId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }
  revalidatePath('/evv')
  return { error: null, success: 'GPS check-in recorded.' }
}

export async function gpsCheckOut(visitId: string, lat: number, lng: number, accuracy: number): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('evv_visits')
    .update({
      actual_end: new Date().toISOString(),
      check_out_method: 'gps',
      check_out_location: { source: 'gps', lat, lng, accuracy, timestamp: new Date().toISOString() },
      status: 'completed',
    })
    .eq('id', visitId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }
  revalidatePath('/evv')
  return { error: null, success: 'GPS check-out recorded.' }
}
