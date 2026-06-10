'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { logAuditEvent } from '@/lib/audit/log'
import { createClient } from '@/lib/supabase/server'

type ActionState = {
  error: string | null
  success?: string | null
}

const trainingSchema = z.object({
  staffId: z.string().uuid('Choose a staff member'),
  trainingName: z.string().min(2, 'Training name is required').max(160),
  trainingCode: z.string().max(60).optional(),
  completedDate: z.string().optional().or(z.literal('')),
  expirationDate: z.string().optional().or(z.literal('')),
  notes: z.string().max(1500).optional(),
})

const statusSchema = z.object({
  trainingId: z.string().uuid(),
  status: z.enum(['current', 'expiring_soon', 'expired', 'not_completed']),
})

function deriveTrainingStatus(completedDate?: string, expirationDate?: string) {
  if (!completedDate) return 'not_completed'
  if (!expirationDate) return 'current'
  const today = new Date()
  const expires = new Date(`${expirationDate}T12:00:00`)
  const days = Math.ceil((expires.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'current'
}

export async function createStaffTraining(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['program_manager', 'org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }

  const parsed = trainingSchema.safeParse({
    staffId: formData.get('staffId') as string,
    trainingName: formData.get('trainingName') as string,
    trainingCode: (formData.get('trainingCode') as string) || undefined,
    completedDate: (formData.get('completedDate') as string) || '',
    expirationDate: (formData.get('expirationDate') as string) || '',
    notes: (formData.get('notes') as string) || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('staff_trainings')
    .insert({
      organization_id: user.organizationId,
      staff_id: parsed.data.staffId,
      training_name: parsed.data.trainingName,
      training_code: parsed.data.trainingCode || null,
      completed_date: parsed.data.completedDate || null,
      expiration_date: parsed.data.expirationDate || null,
      status: deriveTrainingStatus(parsed.data.completedDate, parsed.data.expirationDate),
      notes: parsed.data.notes || null,
    })
    .select('id, training_name')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to add training' }

  await logAuditEvent({
    user,
    action: 'staff_record_updated',
    entityType: 'staff_training',
    entityId: data.id,
    entityLabel: data.training_name,
    details: { staffId: parsed.data.staffId },
  }).catch(() => null)

  revalidatePath('/admin/trainings')
  revalidatePath('/dashboard')
  revalidatePath('/admin/audit-assistant')
  return { error: null, success: 'Training record added.' }
}

export async function updateTrainingStatus(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized' }
  if (!['program_manager', 'org_admin', 'super_admin'].includes(user.role)) return { error: 'Unauthorized' }

  const parsed = statusSchema.safeParse({
    trainingId: formData.get('trainingId') as string,
    status: formData.get('status') as string,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('staff_trainings')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.trainingId)
    .eq('organization_id', user.organizationId)

  if (error) return { error: error.message }

  await logAuditEvent({
    user,
    action: 'staff_record_updated',
    entityType: 'staff_training',
    entityId: parsed.data.trainingId,
    details: { status: parsed.data.status },
  }).catch(() => null)

  revalidatePath('/admin/trainings')
  revalidatePath('/admin/audit-assistant')
  return { error: null, success: 'Training status updated.' }
}
