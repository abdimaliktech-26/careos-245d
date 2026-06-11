import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ClientIncidentsPage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, legal_name')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (!client) return <p className="p-8 text-sm text-muted-foreground">Client not found.</p>

  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('client_id', id)
    .order('occurred_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <Link href={`/clients/${id}`} className="text-xs text-primary hover:underline mb-1 inline-block">← Back to {client.legal_name}</Link>
        <h1 className="text-2xl font-bold text-foreground">Incidents — {client.legal_name}</h1>
      </div>

      {(incidents ?? []).length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-sm text-muted-foreground">No incidents for this client.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="divide-y divide-border/60">
            {(incidents ?? []).map((inc) => (
              <Link key={inc.id} href={`/incidents/${inc.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-muted/40 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{inc.incident_number}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      inc.status === 'open' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' :
                      inc.status === 'under_review' ? 'bg-status-warn-bg text-status-warn' :
                      inc.status === 'reported_to_state' ? 'bg-status-error-bg text-status-error' :
                      'bg-status-ok-bg text-status-ok'
                    }`}>
                      {inc.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {inc.category.replace(/_/g, ' ')} · {new Date(inc.occurred_at).toLocaleDateString('en-US')}
                    {inc.location && ` · ${inc.location}`}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
