import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getAutoBillablePackets } from '@/lib/billing/auto-billing'
import { AutoBillClient } from './auto-bill-client'

export default async function AutoBillPage() {
  const { user, error } = await getSession()
  if (error || !user || !['staff', 'program_manager', 'org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  const packets = await getAutoBillablePackets()

  const totalEstimated = packets.reduce((sum, p) => sum + (p.estimatedAmount ?? 0), 0)

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">Billing</p>
        <h1 className="text-3xl font-bold text-foreground">Auto-Bill</h1>
        <p className="text-muted-foreground mt-1">Completed forms ready for claim generation.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-foreground">{packets.length}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-0.5">Ready for Billing</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalEstimated)}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-0.5">Estimated Total</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-primary">{packets.filter(p => p.cptCode).length}</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mt-0.5">With CPT Code</p>
        </div>
      </div>

      <AutoBillClient packets={packets} />
    </div>
  )
}
