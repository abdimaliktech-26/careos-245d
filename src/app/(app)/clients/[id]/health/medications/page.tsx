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
  if (error || !user) return <p className="p-8 text-sm text-gray-500">Not authenticated.</p>

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
        <Link href={`/clients/${id}/health`} className="text-xs text-[#E8799E] hover:underline mb-1 inline-block">← Back to Health</Link>
        <h1 className="text-2xl font-bold text-[#3A2A4A]">Medications — {client.legal_name}</h1>
      </div>

      <ClientSubNav clientId={id} activeTab="health" />

      <MedicationForm clientId={id} onClose={() => {}} />

      <section className="rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-[#3A2A4A]">Active Medications ({activeMeds.length})</h2>
        </div>
        {activeMeds.length === 0 ? (
          <p className="text-sm text-[#64748B] px-6 py-4">No active medications.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {activeMeds.map((med) => (
              <div key={med.id} className="px-6 py-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#3A2A4A]">{med.medication_name}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      {med.dosage} · {ROUTE_LABELS[med.route] ?? med.route} · {FREQ_LABELS[med.frequency] ?? med.frequency}
                    </p>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Started {new Date(med.start_date).toLocaleDateString('en-US')}
                      {med.end_date && ` · Ended ${new Date(med.end_date).toLocaleDateString('en-US')}`}
                      {med.prescribing_physician && ` · Dr. ${med.prescribing_physician}`}
                    </p>
                    {med.notes && <p className="text-xs text-[#64748B] mt-1 italic">{med.notes}</p>}
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
        <section className="rounded-2xl border border-gray-100 bg-white opacity-60" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-[#64748B]">Discontinued ({discontinuedMeds.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {discontinuedMeds.map((med) => (
              <div key={med.id} className="px-6 py-3">
                <p className="text-sm font-medium text-[#64748B]">{med.medication_name}</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">
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
