import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const STATUS_STYLES: Record<string, string> = {
  given: 'bg-status-ok-bg text-status-ok',
  late: 'bg-status-warn-bg text-status-warn',
  refused: 'bg-status-error-bg text-status-error',
  held: 'bg-status-warn-bg text-status-warn',
  missed: 'bg-status-error-bg text-status-error',
  not_available: 'bg-muted text-muted-foreground',
  error: 'bg-status-error-bg text-status-error',
}

type MarRow = {
  id: string
  status: string
  administered_at: string
  scheduled_for: string | null
  signature: string | null
  reason: string | null
  notes: string | null
  medications: { name: string } | { name: string }[] | null
}

export default async function MarSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')

  const supabase = await createServerClient()
  const [{ data: client }, { data: records }] = await Promise.all([
    supabase.from('clients').select('legal_name, preferred_name').eq('id', id).maybeSingle(),
    supabase
      .from('medication_administration_records')
      .select('id, status, administered_at, scheduled_for, signature, reason, notes, medications(name)')
      .eq('client_id', id)
      .order('administered_at', { ascending: false })
      .limit(200),
  ])
  if (!client) redirect('/clients')
  const name = client.preferred_name || client.legal_name
  const rows = (records ?? []) as MarRow[]

  return (
    <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
      <div className="mb-4 text-[13px] text-muted-foreground">
        <Link href={`/clients/${id}/medications`} className="hover:text-primary">{name} · Medications</Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">MAR sheet</span>
      </div>
      <h1 className="mb-6 text-xl font-bold text-foreground">Medication Administration Record</h1>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-[13px] text-muted-foreground">
          No administrations recorded yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Medication</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Signed by</th>
                <th className="px-4 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const med = Array.isArray(r.medications) ? r.medications[0] : r.medications
                return (
                  <tr key={r.id} className="align-top hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.administered_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{med?.name ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[r.status] ?? 'bg-muted text-muted-foreground'}`}>{r.status.replace('_', ' ')}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.signature ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{[r.reason, r.notes].filter(Boolean).join(' — ') || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
