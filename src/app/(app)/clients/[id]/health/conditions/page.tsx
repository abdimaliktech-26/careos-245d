import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { getClientConditions } from '@/lib/health/actions'
import { ClientSubNav } from '@/components/clients/client-subnav'
import { ConditionForm } from '@/components/health/condition-form'

type Props = { params: Promise<{ id: string }> }

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-status-ok-bg text-status-ok',
  moderate: 'bg-status-warn-bg text-status-warn',
  severe: 'bg-status-error-bg text-status-error',
}

export default async function ConditionsPage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) return <p className="p-8 text-sm text-muted-foreground">Not authenticated.</p>

  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, legal_name')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (!client) notFound()

  const result = await getClientConditions(id)
  const conditions = result.data ?? []

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <Link href={`/clients/${id}/health`} className="text-xs text-primary hover:underline mb-1 inline-block">← Back to Health</Link>
        <h1 className="text-2xl font-bold text-foreground">Health Conditions — {client.legal_name}</h1>
      </div>

      <ClientSubNav clientId={id} activeTab="health" />

      <ConditionForm clientId={id} onClose={() => {}} />

      <section className="rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">All Conditions ({conditions.length})</h2>
        </div>
        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-4">No conditions recorded.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {conditions.map((cond) => (
              <div key={cond.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{cond.condition_name}</p>
                    {cond.is_chronic && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Chronic</span>
                    )}
                    {cond.severity && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[cond.severity] ?? 'bg-muted text-muted-foreground'}`}>
                        {cond.severity}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                  {cond.diagnosis_date && <span>Diagnosed {new Date(cond.diagnosis_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>}
                </div>
                {cond.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{cond.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
