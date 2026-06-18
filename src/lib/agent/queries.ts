import { createClient } from '@/lib/supabase/server'

export type ValidationRunRow = {
  id: string
  subject_type: string
  subject_id: string
  trigger: string
  verdict: string
  flags: { code: string; severity: string; message: string; field?: string }[]
  program_recommendation: { program: string; confidence: number; reason: string } | null
  ai_summary: string | null
  ai_status: string
  created_at: string
}

/** Recent non-passing validation runs for the current user's org (RLS-scoped). */
export async function getRecentFlaggedRuns(limit = 25): Promise<ValidationRunRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('agent_validation_runs')
    .select('id, subject_type, subject_id, trigger, verdict, flags, program_recommendation, ai_summary, ai_status, created_at')
    .in('verdict', ['warn', 'fail'])
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as ValidationRunRow[]
}
