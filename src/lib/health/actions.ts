'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Medication, Vital, HealthCondition, HealthSummary } from '@/types/health'

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

const medicationSchema = z.object({
  clientId: z.string().min(1),
  medicationName: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  route: z.enum(['oral', 'topical', 'injection', 'inhalation', 'sublingual', 'rectal', 'ophthalmic', 'otic', 'other']),
  frequency: z.enum(['once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'every_4_hours', 'every_6_hours', 'every_8_hours', 'every_12_hours', 'weekly', 'monthly', 'as_needed', 'other']),
  prescribedBy: z.string().optional(),
  prescribingPhysician: z.string().optional(),
  pharmacyName: z.string().optional(),
  pharmacyPhone: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
})

const vitalSchema = z.object({
  clientId: z.string().min(1),
  vitalType: z.enum(['blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'temperature', 'respiratory_rate', 'oxygen_saturation', 'blood_glucose', 'weight', 'height', 'bmi', 'pain_level', 'other']),
  value: z.number(),
  unit: z.string().optional(),
  recordedAt: z.string().optional(),
  notes: z.string().optional(),
})

const conditionSchema = z.object({
  clientId: z.string().min(1),
  conditionName: z.string().min(1, 'Condition name is required'),
  diagnosisDate: z.string().optional(),
  isChronic: z.boolean().default(false),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  notes: z.string().optional(),
})

export async function addMedication(data: z.infer<typeof medicationSchema>): Promise<ActionResult<Medication>> {
  const parsed = medicationSchema.safeParse(data)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }
  if (!user.organizationId) return { data: null, error: 'No organization assigned' }

  const supabase = await createClient()
  const { data: medication, error } = await supabase
    .from('client_medications')
    .insert({
      organization_id: user.organizationId,
      client_id: parsed.data.clientId,
      medication_name: parsed.data.medicationName,
      dosage: parsed.data.dosage,
      route: parsed.data.route,
      frequency: parsed.data.frequency,
      prescribed_by: parsed.data.prescribedBy || null,
      prescribing_physician: parsed.data.prescribingPhysician || null,
      pharmacy_name: parsed.data.pharmacyName || null,
      pharmacy_phone: parsed.data.pharmacyPhone || null,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate || null,
      is_active: parsed.data.isActive,
      notes: parsed.data.notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${parsed.data.clientId}/health`)
  revalidatePath(`/clients/${parsed.data.clientId}/health/medications`)
  return { data: medication as Medication, error: null }
}

export async function updateMedication(id: string, data: Partial<z.infer<typeof medicationSchema>>): Promise<ActionResult<Medication>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createClient()
  const updates: Record<string, unknown> = {}
  if (data.medicationName !== undefined) updates.medication_name = data.medicationName
  if (data.dosage !== undefined) updates.dosage = data.dosage
  if (data.route !== undefined) updates.route = data.route
  if (data.frequency !== undefined) updates.frequency = data.frequency
  if (data.prescribedBy !== undefined) updates.prescribed_by = data.prescribedBy || null
  if (data.prescribingPhysician !== undefined) updates.prescribing_physician = data.prescribingPhysician || null
  if (data.pharmacyName !== undefined) updates.pharmacy_name = data.pharmacyName || null
  if (data.pharmacyPhone !== undefined) updates.pharmacy_phone = data.pharmacyPhone || null
  if (data.startDate !== undefined) updates.start_date = data.startDate
  if (data.endDate !== undefined) updates.end_date = data.endDate || null
  if (data.isActive !== undefined) updates.is_active = data.isActive
  if (data.notes !== undefined) updates.notes = data.notes || null

  const { data: medication, error } = await supabase
    .from('client_medications')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${medication.client_id}/health`)
  revalidatePath(`/clients/${medication.client_id}/health/medications`)
  return { data: medication as Medication, error: null }
}

export async function discontinueMedication(id: string): Promise<ActionResult<Medication>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: medication, error } = await supabase
    .from('client_medications')
    .update({
      is_active: false,
      end_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${medication.client_id}/health`)
  revalidatePath(`/clients/${medication.client_id}/health/medications`)
  return { data: medication as Medication, error: null }
}

export async function getClientMedications(clientId: string): Promise<ActionResult<Medication[]>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_medications')
    .select('*')
    .eq('client_id', clientId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data as Medication[], error: null }
}

export async function recordVital(data: z.infer<typeof vitalSchema>): Promise<ActionResult<Vital>> {
  const parsed = vitalSchema.safeParse(data)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }
  if (!user.organizationId) return { data: null, error: 'No organization assigned' }

  const supabase = await createClient()
  const { data: vital, error } = await supabase
    .from('health_vitals')
    .insert({
      organization_id: user.organizationId,
      client_id: parsed.data.clientId,
      vital_type: parsed.data.vitalType,
      value: parsed.data.value,
      unit: parsed.data.unit || null,
      recorded_by: user.id,
      recorded_at: parsed.data.recordedAt || new Date().toISOString(),
      notes: parsed.data.notes || null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${parsed.data.clientId}/health`)
  revalidatePath(`/clients/${parsed.data.clientId}/health/vitals`)
  return { data: vital as Vital, error: null }
}

export async function getClientVitals(
  clientId: string,
  type?: string,
  limit = 20
): Promise<ActionResult<Vital[]>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createClient()
  let query = supabase
    .from('health_vitals')
    .select('*')
    .eq('client_id', clientId)
    .order('recorded_at', { ascending: false })
    .limit(limit)

  if (type) query = query.eq('vital_type', type)

  const { data, error } = await query
  if (error) return { data: null, error: error.message }
  return { data: data as Vital[], error: null }
}

export async function addCondition(data: z.infer<typeof conditionSchema>): Promise<ActionResult<HealthCondition>> {
  const parsed = conditionSchema.safeParse(data)
  if (!parsed.success) return { data: null, error: parsed.error.issues[0].message }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }
  if (!user.organizationId) return { data: null, error: 'No organization assigned' }

  const supabase = await createClient()
  const { data: condition, error } = await supabase
    .from('health_conditions')
    .insert({
      organization_id: user.organizationId,
      client_id: parsed.data.clientId,
      condition_name: parsed.data.conditionName,
      diagnosis_date: parsed.data.diagnosisDate || null,
      is_chronic: parsed.data.isChronic,
      severity: parsed.data.severity || null,
      notes: parsed.data.notes || null,
    })
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${parsed.data.clientId}/health`)
  revalidatePath(`/clients/${parsed.data.clientId}/health/conditions`)
  return { data: condition as HealthCondition, error: null }
}

export async function updateCondition(id: string, data: Partial<z.infer<typeof conditionSchema>>): Promise<ActionResult<HealthCondition>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createClient()
  const updates: Record<string, unknown> = {}
  if (data.conditionName !== undefined) updates.condition_name = data.conditionName
  if (data.diagnosisDate !== undefined) updates.diagnosis_date = data.diagnosisDate || null
  if (data.isChronic !== undefined) updates.is_chronic = data.isChronic
  if (data.severity !== undefined) updates.severity = data.severity || null
  if (data.notes !== undefined) updates.notes = data.notes || null

  const { data: condition, error } = await supabase
    .from('health_conditions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  revalidatePath(`/clients/${condition.client_id}/health`)
  revalidatePath(`/clients/${condition.client_id}/health/conditions`)
  return { data: condition as HealthCondition, error: null }
}

export async function getClientConditions(clientId: string): Promise<ActionResult<HealthCondition[]>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('health_conditions')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data as HealthCondition[], error: null }
}

export async function getHealthSummary(clientId: string): Promise<ActionResult<HealthSummary>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) return { data: null, error: 'Unauthorized' }

  const supabase = await createClient()
  const [conditionsResult, medicationsResult, vitalsResult] = await Promise.all([
    supabase.from('health_conditions').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
    supabase.from('client_medications').select('*').eq('client_id', clientId).eq('is_active', true).order('created_at', { ascending: false }),
    supabase.from('health_vitals').select('*').eq('client_id', clientId).order('recorded_at', { ascending: false }).limit(20),
  ])

  if (conditionsResult.error) return { data: null, error: conditionsResult.error.message }
  if (medicationsResult.error) return { data: null, error: medicationsResult.error.message }
  if (vitalsResult.error) return { data: null, error: vitalsResult.error.message }

  return {
    data: {
      conditions: conditionsResult.data as HealthCondition[],
      activeMedications: medicationsResult.data as Medication[],
      recentVitals: vitalsResult.data as Vital[],
    },
    error: null,
  }
}


