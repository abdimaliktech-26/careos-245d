'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'
import type { Goal, GoalProgress } from './types'

const createGoalSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  category: z.enum(['clinical', 'behavioral', 'developmental', 'social', 'communication', 'daily_living', 'employment', 'education', 'health', 'other']),
  targetDate: z.string().optional(),
  startDate: z.string().optional(),
})

const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  category: z.enum(['clinical', 'behavioral', 'developmental', 'social', 'communication', 'daily_living', 'employment', 'education', 'health', 'other']).optional(),
  status: z.enum(['active', 'in_progress', 'achieved', 'discontinued', 'revised']).optional(),
  targetDate: z.string().optional(),
  achievedDate: z.string().nullable().optional(),
})

const recordProgressSchema = z.object({
  progressNote: z.string().min(1, 'Progress note is required'),
  progressScore: z.number().int().min(0).max(100).optional().nullable(),
  packetFormId: z.string().uuid().optional().nullable(),
})

type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: string }

export async function createGoal(
  input: z.infer<typeof createGoalSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = createGoalSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) {
    return { data: null, error: 'Unauthorized' }
  }
  if (!user.organizationId) {
    return { data: null, error: 'No organization assigned' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .insert({
      organization_id: user.organizationId,
      client_id: parsed.data.clientId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      category: parsed.data.category,
      target_date: parsed.data.targetDate || null,
      start_date: parsed.data.startDate || null,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to create goal' }
  }

  revalidatePath(`/clients/${parsed.data.clientId}/goals`)
  return { data: { id: data.id }, error: null }
}

export async function updateGoal(
  id: string,
  input: z.infer<typeof updateGoalSchema>
): Promise<ActionResult<void>> {
  const parsed = updateGoalSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const updates: Record<string, unknown> = {}

  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.description !== undefined) updates.description = parsed.data.description || null
  if (parsed.data.category !== undefined) updates.category = parsed.data.category
  if (parsed.data.status !== undefined) updates.status = parsed.data.status
  if (parsed.data.targetDate !== undefined) updates.target_date = parsed.data.targetDate || null
  if (parsed.data.achievedDate !== undefined) updates.achieved_date = parsed.data.achievedDate
  updates.updated_at = new Date().toISOString()

  const { error } = await supabase.from('goals').update(updates).eq('id', id)
  if (error) return { data: null, error: error.message }

  revalidatePath(`/clients/${id}/goals`)
  return { data: undefined, error: null }
}

export async function deleteGoal(id: string): Promise<ActionResult<void>> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { data: goal } = await supabase
    .from('goals')
    .select('client_id')
    .eq('id', id)
    .single()

  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) return { data: null, error: error.message }

  if (goal) revalidatePath(`/clients/${goal.client_id}/goals`)
  return { data: undefined, error: null }
}

export async function recordProgress(
  goalId: string,
  input: z.infer<typeof recordProgressSchema>
): Promise<ActionResult<{ id: string }>> {
  const parsed = recordProgressSchema.safeParse(input)
  if (!parsed.success) {
    return { data: null, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) {
    return { data: null, error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goal_progress')
    .insert({
      goal_id: goalId,
      progress_note: parsed.data.progressNote,
      progress_score: parsed.data.progressScore ?? null,
      packet_form_id: parsed.data.packetFormId ?? null,
      recorded_by: user.id,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Failed to record progress' }
  }

  revalidatePath(`/clients/${goalId}/goals`)
  return { data: { id: data.id }, error: null }
}

export async function getClientGoals(clientId: string): Promise<ActionResult<Goal[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data: data as Goal[], error: null }
}

export async function getGoal(id: string): Promise<ActionResult<Goal>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Goal not found' }
  }

  const { data: progress } = await supabase
    .from('goal_progress')
    .select('*')
    .eq('goal_id', id)
    .order('recorded_at', { ascending: false })

  return {
    data: { ...data, goal_progress: (progress ?? []) as GoalProgress[] } as Goal,
    error: null,
  }
}

export async function getGoalStats(clientId: string): Promise<ActionResult<{
  active: number
  in_progress: number
  achieved: number
  total: number
}>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('goals')
    .select('status')
    .eq('client_id', clientId)

  if (error) return { data: null, error: error.message }

  const goals = data as Array<{ status: string }>
  const stats = {
    active: goals.filter((g) => g.status === 'active').length,
    in_progress: goals.filter((g) => g.status === 'in_progress').length,
    achieved: goals.filter((g) => g.status === 'achieved').length,
    total: goals.length,
  }

  return { data: stats, error: null }
}
