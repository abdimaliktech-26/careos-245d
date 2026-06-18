import { createClient } from '@/lib/supabase/server'
import type { ServicePlan, PlanService, PlanRisk, PlanSignature } from './types'

export type PlanDetail = ServicePlan & {
  services: PlanService[]
  risks: PlanRisk[]
  signatures: PlanSignature[]
  outcomes: { id: string; goal_id: string; sort_order: number; goals: { id: string; title: string; status: string } | null }[]
}

/** Plans for a client, newest first (RLS-scoped). */
export async function getClientPlans(clientId: string): Promise<ServicePlan[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('service_plans')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  return (data ?? []) as ServicePlan[]
}

/** One plan with children + linked goal summaries. */
export async function getPlan(planId: string): Promise<PlanDetail | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('service_plans')
    .select(`*,
      services:plan_services(*),
      risks:plan_risks(*),
      signatures:plan_signatures(*),
      outcomes:plan_outcomes(id, goal_id, sort_order, goals(id, title, status))`)
    .eq('id', planId)
    .maybeSingle()
  return (data as PlanDetail | null) ?? null
}
