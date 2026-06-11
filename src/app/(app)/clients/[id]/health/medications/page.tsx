import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { getClientMedications, discontinueMedication } from '@/lib/health/actions'
import { ClientSubNav } from '@/components/clients/client-subnav'
import { MedicationForm } from '@/components/health/medication-form'

type Props = { params: Promise<{ id: string }> }

const ROUTE_LABELS: Record<string, string> = {
  oral: 'Oral', topical: 'Topical', injection: 'Injection', inhalation: 'Inhalation',
  sublingual: 'Sublingual', rectal: 'Rectal', ophthalmic: 'Ophthalmic', otic: 'Otic', other: 'Other',
}

const FREQ_LABELS: Record<string, string> = {
  once_daily: 'Once Daily', twice_daily: 'Twice Daily', three_times_daily: '3x Daily',
  four_times_daily: '4x Daily', every_4_hours: 'Every 4h', every_6_hours: 'Every 6h',
  every_8_hours: 'Every 8h', every_12_hours: 'Every 12h', weekly: 'Weekly',
  monthly: 'Monthly', as_needed: 'As Needed', other: 'Other',
}

export default async function MedicationsPage({ params }: Props) {
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

  const result = await getClientMedications(id)
  const medications = result.data ?? []
  const activeMeds = medications.filter((m) => m.is_active)
  const discontinuedMeds = medications.filter((m) => !m.is_active)

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <Link href={`/clients/${id}/health`} className="text-xs text-primary hover:underline mb-1 inline-block">← Back to Health</Link>
        <h1 className="text-2xl font-bold text-foreground">Medications — {client.legal_name}</h1>
      </div>

      <ClientSubNav clientId={id} activeTab="health" />

      <MedicationForm clientId={id} onClose={() => {}} />

      <section className="rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Active Medications ({activeMeds.length})</h2>
        </div>
        {activeMeds.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-4">No active medications.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {activeMeds.map((med) => (
              <div key={med.id} className="px-6 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{med.medication_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {med.dosage} · {ROUTE_LABELS[med.route] ?? med.route} · {FREQ_LABELS[med.frequency] ?? med.frequency}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Started {new Date(med.start_date).toLocaleDateString('en-US')}
                      {med.end_date && ` · Ended ${new Date(med.end_date).toLocaleDateString('en-US')}`}
                      {med.prescribing_physician && ` · Dr. ${med.prescribing_physician}`}
                    </p>
                    {med.notes && <p className="text-xs text-muted-foreground mt-1 italic">{med.notes}</p>}
                  </div>
                  <form action={async () => {
                    'use server'
                    await discontinueMedication(med.id)
                  }}>
                    <button
                      type="submit"
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Discontinue
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {discontinuedMeds.length > 0 && (
        <section className="rounded-2xl border border-border bg-card opacity-60" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-muted-foreground">Discontinued ({discontinuedMeds.length})</h2>
          </div>
          <div className="divide-y divide-border/60">
            {discontinuedMeds.map((med) => (
              <div key={med.id} className="px-6 py-3">
                <p className="text-sm font-medium text-muted-foreground">{med.medication_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {med.dosage} · {ROUTE_LABELS[med.route] ?? med.route} · {FREQ_LABELS[med.frequency] ?? med.frequency}
                  {med.end_date && ` · Ended ${new Date(med.end_date).toLocaleDateString('en-US')}`}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
