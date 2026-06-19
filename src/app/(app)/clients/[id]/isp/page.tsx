import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getClientPlans } from '@/lib/isp/queries'
import { PlanStatusBadge } from '@/components/isp/plan-status-badge'

export default async function ClientIspPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const plans = await getClientPlans(id)
  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Service Plans</h1>
        <Link href={`/clients/${id}/isp/new`} className="rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground">New plan</Link>
      </div>
      {plans.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No service plans yet.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-2xl border border-border bg-card">
          {plans.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-5 py-3.5">
              <Link href={`/clients/${id}/isp/${p.id}`} className="text-[13px] font-semibold text-foreground hover:text-primary">
                {p.plan_type ?? 'CSSP'} · effective {p.effective_date ?? '—'}
              </Link>
              <PlanStatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
