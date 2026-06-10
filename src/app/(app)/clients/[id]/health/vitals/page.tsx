import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { getClientVitals } from '@/lib/health/actions'
import { getVitalLabel, getVitalUnit } from '@/types/health'
import { ClientSubNav } from '@/components/clients/client-subnav'
import { VitalsForm } from '@/components/health/vitals-form'
import { VitalTrend } from '@/components/health/vital-trend'
import type { Vital } from '@/types/health'

type Props = { params: Promise<{ id: string }> }

const VITAL_GROUPS = [
  'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
  'temperature', 'respiratory_rate', 'oxygen_saturation', 'blood_glucose',
  'weight', 'height', 'bmi', 'pain_level',
] as const

async function getVitalGroups(clientId: string): Promise<Record<string, Vital[]>> {
  const supabase = await createClient()
  const grouped: Record<string, Vital[]> = {}

  for (const vt of VITAL_GROUPS) {
    const { data } = await supabase
      .from('health_vitals')
      .select('*')
      .eq('client_id', clientId)
      .eq('vital_type', vt)
      .order('recorded_at', { ascending: false })
      .limit(10)

    if (data && data.length > 0) grouped[vt] = data as Vital[]
  }

  return grouped
}

export default async function VitalsPage({ params }: Props) {
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

  const allVitalsResult = await getClientVitals(id)
  const allVitals = allVitalsResult.data ?? []
  const vitalGroups = await getVitalGroups(id)

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <Link href={`/clients/${id}/health`} className="text-xs text-[#E8799E] hover:underline mb-1 inline-block">← Back to Health</Link>
        <h1 className="text-2xl font-bold text-[#3A2A4A]">Vitals — {client.legal_name}</h1>
      </div>

      <ClientSubNav clientId={id} activeTab="health" />

      <div className="rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 className="text-sm font-semibold text-[#3A2A4A] mb-3">Quick Record</h2>
        <VitalsForm clientId={id} onClose={() => {}} />
      </div>

      {Object.keys(vitalGroups).length > 0 && (
        <section className="rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-[#3A2A4A]">Trends</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {Object.entries(vitalGroups).map(([type, readings]) => (
              <div key={type} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#3A2A4A]">{getVitalLabel(type)}</p>
                  <p className="text-xs text-[#64748B]">
                    Latest: {readings[0].value} {readings[0].unit ?? getVitalUnit(type)}
                  </p>
                </div>
                <VitalTrend vitals={readings} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-[#3A2A4A]">All Readings ({allVitals.length})</h2>
        </div>
        {allVitals.length === 0 ? (
          <p className="text-sm text-[#64748B] px-6 py-4">No vitals recorded.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {allVitals.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#3A2A4A]">{getVitalLabel(v.vital_type)}</p>
                  {v.notes && <p className="text-xs text-[#64748B]">{v.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#3A2A4A]">
                    {v.value} <span className="text-xs text-[#64748B]">{v.unit ?? getVitalUnit(v.vital_type)}</span>
                  </p>
                  <p className="text-[10px] text-[#64748B]">
                    {new Date(v.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
