import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { Pill } from 'lucide-react'

export const dynamic = 'force-dynamic'

type MedRow = {
  id: string
  name: string
  dosage: string | null
  route: string | null
  frequency: string | null
  status: string
  is_prn: boolean
  is_controlled: boolean
  client_id: string
  clients: { legal_name: string; preferred_name: string | null } | { legal_name: string; preferred_name: string | null }[] | null
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-status-ok-bg text-status-ok',
  discontinued: 'bg-muted text-muted-foreground',
  expired: 'bg-status-error-bg text-status-error',
  pending: 'bg-status-warn-bg text-status-warn',
}

function clientName(c: MedRow['clients']): string {
  const row = Array.isArray(c) ? c[0] : c
  if (!row) return 'Unknown'
  return row.preferred_name || row.legal_name
}

export default async function MedicationsPage() {
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')

  const supabase = await createServerClient()
  const { data: meds } = await supabase
    .from('medications')
    .select('id, name, dosage, route, frequency, status, is_prn, is_controlled, client_id, clients(legal_name, preferred_name)')
    .order('created_at', { ascending: false })

  const rows = (meds ?? []) as MedRow[]

  return (
    <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-from to-brand-to text-white">
          <Pill className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-foreground">Medications</h1>
          <p className="text-[13px] text-muted-foreground">All client medication profiles across your organization.</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Pill className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">No medications yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Add medications from a client&apos;s profile to start tracking the MAR.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Medication</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Dose / Route</th>
                <th className="px-4 py-3 font-semibold">Frequency</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link href={`/clients/${m.client_id}/medications`} className="font-semibold text-foreground hover:text-primary">
                      {m.name}
                    </Link>
                    <div className="flex gap-1.5 pt-1">
                      {m.is_prn && <span className="rounded bg-status-warn-bg px-1.5 py-0.5 text-[10px] font-bold text-status-warn">PRN</span>}
                      {m.is_controlled && <span className="rounded bg-status-error-bg px-1.5 py-0.5 text-[10px] font-bold text-status-error">CONTROLLED</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{clientName(m.clients)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{[m.dosage, m.route].filter(Boolean).join(' · ') || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.frequency || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${STATUS_STYLES[m.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
