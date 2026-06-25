import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { AddMedicationForm } from '@/components/medications/add-medication-form'
import type { Medication } from '@/types/app'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-status-ok-bg text-status-ok',
  discontinued: 'bg-muted text-muted-foreground',
  expired: 'bg-status-error-bg text-status-error',
  pending: 'bg-status-warn-bg text-status-warn',
}

export default async function ClientMedicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')

  const supabase = await createServerClient()
  const [{ data: client }, { data: meds }] = await Promise.all([
    supabase.from('clients').select('id, legal_name, preferred_name').eq('id', id).maybeSingle(),
    supabase.from('medications').select('*').eq('client_id', id).order('created_at', { ascending: false }),
  ])
  if (!client) redirect('/clients')

  const rows = (meds ?? []) as Medication[]
  const name = client.preferred_name || client.legal_name

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <div className="mb-4 text-[13px] text-muted-foreground">
        <Link href={`/clients/${id}`} className="hover:text-primary">{name}</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">Medications</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Medications</h1>
        <Link href={`/clients/${id}/mar`} className="rounded-lg border border-border px-3 py-1.5 text-[13px] font-semibold text-foreground hover:bg-muted">
          View MAR sheet
        </Link>
      </div>

      <AddMedicationForm clientId={id} />

      <div className="mt-6 space-y-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
            No medications recorded for {name} yet.
          </div>
        ) : rows.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold text-foreground">{m.name}{m.generic_name ? <span className="font-normal text-muted-foreground"> ({m.generic_name})</span> : null}</p>
                <p className="text-[13px] text-muted-foreground">
                  {[m.dosage, m.route, m.frequency].filter(Boolean).join(' · ') || '—'}
                </p>
                {m.administration_times?.length > 0 && (
                  <p className="mt-1 text-[12px] text-muted-foreground">Times: {m.administration_times.join(', ')}</p>
                )}
                {m.special_instructions && <p className="mt-1 text-[12px] text-status-warn">{m.special_instructions}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.is_prn && <span className="rounded bg-status-warn-bg px-1.5 py-0.5 text-[10px] font-bold text-status-warn">PRN</span>}
                  {m.is_controlled && <span className="rounded bg-status-error-bg px-1.5 py-0.5 text-[10px] font-bold text-status-error">CONTROLLED</span>}
                  {m.prescribing_physician && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Dr. {m.prescribing_physician}</span>}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[m.status] ?? 'bg-muted text-muted-foreground'}`}>
                {m.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
