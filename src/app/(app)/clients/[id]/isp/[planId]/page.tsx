import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getPlan } from '@/lib/isp/queries'
import { getClientGoals } from '@/lib/goals/actions'
import { activatePlan, setReviewStatus } from '@/lib/isp/actions'
import { PlanStatusBadge } from '@/components/isp/plan-status-badge'
import { ServicesEditor } from '@/components/isp/services-editor'
import { RisksEditor } from '@/components/isp/risks-editor'
import { OutcomesPicker } from '@/components/isp/outcomes-picker'
import { SignaturesPanel } from '@/components/isp/signatures-panel'

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const plan = await getPlan(planId)
  if (!plan) redirect(`/clients/${id}/isp`)
  const goalsRes = await getClientGoals(id)
  const goals = (goalsRes.data ?? []).map((g) => ({ id: g.id, title: g.title }))

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{plan.plan_type ?? 'CSSP'}</h1>
        <div className="flex items-center gap-3">
          <PlanStatusBadge status={plan.status} />
          {plan.status === 'draft' && (
            <form action={async () => { 'use server'; await activatePlan(planId, id) }}>
              <button className="rounded-lg bg-primary px-3 py-1.5 text-[12px] font-bold text-primary-foreground">Activate</button>
            </form>
          )}
          {plan.status === 'active' && (
            <form action={async () => { 'use server'; await setReviewStatus(planId, id, 'under_review') }}>
              <button className="rounded-lg border border-border px-3 py-1.5 text-[12px] font-semibold">Start review</button>
            </form>
          )}
        </div>
      </div>
      <ServicesEditor planId={planId} clientId={id} services={plan.services} />
      <OutcomesPicker planId={planId} clientId={id} goals={goals} linked={plan.outcomes.map((o) => ({ id: o.id, goal_id: o.goal_id }))} />
      <RisksEditor planId={planId} clientId={id} risks={plan.risks} />
      <SignaturesPanel planId={planId} clientId={id} signatures={plan.signatures} />
    </div>
  )
}
