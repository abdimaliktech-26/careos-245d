import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { getHealthSummary } from '@/lib/health/actions'
import { getVitalLabel, getVitalUnit } from '@/types/health'
import { ClientSubNav } from '@/components/clients/client-subnav'
import { MedicationForm } from '@/components/health/medication-form'
import { VitalsForm } from '@/components/health/vitals-form'
import { ConditionForm } from '@/components/health/condition-form'

type Props = { params: Promise<{ id: string }> }

const SEVERITY_COLORS: Record<string, string> = {
  mild: 'bg-status-ok-bg text-status-ok',
  moderate: 'bg-status-warn-bg text-status-warn',
  severe: 'bg-status-error-bg text-status-error',
}

function SeverityBadge({ severity }: { severity: string | null }) {
  if (!severity) return null
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[severity] ?? 'bg-muted text-muted-foreground'}`}>
      {severity}
    </span>
  )
}

const VITAL_DISPLAY_TYPES = ['blood_pressure_systolic', 'heart_rate', 'temperature', 'oxygen_saturation', 'blood_glucose', 'weight'] as const

function getLatestVitals(vitals: Array<{ vital_type: string; value: number; unit: string | null; recorded_at: string }>) {
  const latest: Record<string, (typeof vitals)[number]> = {}
  for (const v of vitals) {
    if (!latest[v.vital_type] || new Date(v.recorded_at) > new Date(latest[v.vital_type].recorded_at)) {
      latest[v.vital_type] = v
    }
  }
  return latest
}

export default async function HealthDashboardPage({ params }: Props) {
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

  const summaryResult = await getHealthSummary(id)
  const summary = summaryResult.data

  const conditionsCount = summary?.conditions.length ?? 0
  const medsCount = summary?.activeMedications.length ?? 0
  const vitalsCount = summary?.recentVitals.length ?? 0
  const latestVitals = summary?.recentVitals ? getLatestVitals(summary.recentVitals) : {}

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <Link href={`/clients/${id}`} className="text-xs text-primary hover:underline mb-1 inline-block">← Back to {client.legal_name}</Link>
        <h1 className="text-2xl font-bold text-foreground">Health — {client.legal_name}</h1>
      </div>

      <ClientSubNav clientId={id} activeTab="health" />

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-foreground">{conditionsCount}</p>
          <p className="text-xs text-muted-foreground">Active Conditions</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-foreground">{medsCount}</p>
          <p className="text-xs text-muted-foreground">Active Medications</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-2xl font-bold text-foreground">{vitalsCount}</p>
          <p className="text-xs text-muted-foreground">Vitals Recorded</p>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Active Medications</h2>
          <div className="flex items-center gap-3">
            <MedicationForm clientId={id} onClose={() => {}} />
            <Link href={`/clients/${id}/health/medications`} className="text-xs font-semibold text-primary hover:underline">View All</Link>
          </div>
        </div>
        {summary && summary.activeMedications.length > 0 ? (
          <div className="divide-y divide-border/60">
            {summary.activeMedications.slice(0, 5).map((med) => (
              <div key={med.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{med.medication_name}</p>
                  <p className="text-xs text-muted-foreground">{med.dosage} · {med.frequency.replace(/_/g, ' ')} · {med.route}</p>
                </div>
                <p className="text-xs text-muted-foreground">{med.prescribed_by ?? '—'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground px-6 py-4">No medications recorded.</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Recent Vitals</h2>
          <div className="flex items-center gap-3">
            <VitalsForm clientId={id} onClose={() => {}} />
            <Link href={`/clients/${id}/health/vitals`} className="text-xs font-semibold text-primary hover:underline">View All</Link>
          </div>
        </div>
        {Object.keys(latestVitals).length > 0 ? (
          <div className="divide-y divide-border/60">
            {VITAL_DISPLAY_TYPES.map((vt) => {
              const reading = latestVitals[vt]
              if (!reading) return null
              return (
                <div key={vt} className="flex items-center justify-between px-6 py-3">
                  <p className="text-sm font-medium text-foreground">{getVitalLabel(vt)}</p>
                  <p className="text-sm font-semibold text-foreground">
                    {reading.value} <span className="text-xs text-muted-foreground">{reading.unit ?? getVitalUnit(vt)}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {new Date(reading.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground px-6 py-4">No vitals recorded.</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Health Conditions</h2>
          <div className="flex items-center gap-3">
            <ConditionForm clientId={id} onClose={() => {}} />
            <Link href={`/clients/${id}/health/conditions`} className="text-xs font-semibold text-primary hover:underline">View All</Link>
          </div>
        </div>
        {summary && summary.conditions.length > 0 ? (
          <div className="divide-y divide-border/60">
            {summary.conditions.slice(0, 5).map((cond) => (
              <div key={cond.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{cond.condition_name}</p>
                  {cond.is_chronic && (
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Chronic</span>
                  )}
                </div>
                <SeverityBadge severity={cond.severity} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground px-6 py-4">No conditions recorded.</p>
        )}
      </section>
    </div>
  )
}
