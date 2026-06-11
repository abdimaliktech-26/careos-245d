import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { IncidentStatusBadge, IncidentCategoryBadge } from '@/components/incidents/incident-badges'
import { IncidentTimeline } from '@/components/incidents/incident-timeline'
import { IncidentAttachments } from '@/components/incidents/incident-attachments'

type Props = {
  params: Promise<{ id: string }>
}

export default async function IncidentDetailPage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const { id } = await params
  const supabase = await createClient()

  const { data: incident } = await supabase
    .from('incidents')
    .select('*, clients(legal_name)')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (!incident) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-muted-foreground">Incident not found.</p>
        <Link href="/incidents" className="text-sm text-primary hover:underline mt-2 inline-block">Back to incidents</Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/incidents" className="text-xs text-primary hover:underline mb-1 inline-block">← Back to Incidents</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-foreground">{incident.incident_number}</h1>
            <IncidentStatusBadge status={incident.status} />
            <IncidentCategoryBadge category={incident.category} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {incident.clients?.legal_name && <span>{incident.clients.legal_name} · </span>}
            {new Date(incident.occurred_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {incident.location && ` · ${incident.location}`}
          </p>
        </div>
        <Link
          href={`/incidents/${id}/edit`}
          className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Description */}
      <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase mb-3">Description</h2>
        <p className="text-sm text-foreground whitespace-pre-wrap">{incident.description}</p>
        {incident.immediate_actions && (
          <>
            <h3 className="text-xs font-semibold text-muted-foreground mt-4 mb-2">Immediate Actions Taken</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{incident.immediate_actions}</p>
          </>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase mb-3">Notifications</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Guardian</span><span className={incident.guardian_notified ? 'text-status-ok font-semibold' : 'text-status-error'}>{incident.guardian_notified ? `Yes${incident.guardian_notified_at ? ` · ${new Date(incident.guardian_notified_at).toLocaleDateString()}` : ''}` : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Case Manager</span><span className={incident.case_manager_notified ? 'text-status-ok font-semibold' : 'text-status-error'}>{incident.case_manager_notified ? `Yes${incident.case_manager_notified_at ? ` · ${new Date(incident.case_manager_notified_at).toLocaleDateString()}` : ''}` : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">DHS/State</span><span className={incident.dhs_reported ? 'text-status-ok font-semibold' : 'text-muted-foreground'}>{incident.dhs_reported ? `Yes · #${incident.dhs_report_number ?? ''}` : 'No'}</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h2 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase mb-3">Follow-Up</h2>
          {incident.follow_up_required ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Due Date</span><span className="font-semibold text-foreground">{incident.follow_up_due_date ? new Date(incident.follow_up_due_date).toLocaleDateString('en-US') : 'Not set'}</span></div>
              {incident.follow_up_notes && <p className="text-muted-foreground mt-1">{incident.follow_up_notes}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No follow-up required</p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <IncidentTimeline incident={incident} />

      {/* Attachments */}
      <IncidentAttachments incidentId={id} />
    </div>
  )
}
