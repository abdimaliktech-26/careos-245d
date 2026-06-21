import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { TrainingForm } from '@/components/staff-trainings/training-form'
import { TrainingStatusForm } from '@/components/staff-trainings/training-status-form'

const STATUS_CLASS: Record<string, string> = {
  current: 'bg-status-ok-bg text-status-ok',
  expiring_soon: 'bg-status-warn-bg text-status-warn',
  expired: 'bg-status-error-bg text-status-error',
  not_completed: 'bg-muted text-muted-foreground',
}

const STATUS_DOT: Record<string, string> = {
  current: 'bg-emerald-500',
  expiring_soon: 'bg-amber-500',
  expired: 'bg-red-500',
  not_completed: 'bg-gray-400',
}

export default async function StaffTrainingsPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')
  if (!['program_manager', 'org_admin', 'super_admin'].includes(user.role)) redirect('/dashboard')

  const supabase = await createClient()
  const [{ data: staff }, { data: trainings }] = await Promise.all([
    supabase
      .from('staff_profiles')
      .select('id, full_name')
      .eq('organization_id', user.organizationId)
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('staff_trainings')
      .select('id, training_name, training_code, completed_date, expiration_date, status, notes, staff_profiles(full_name, email)')
      .eq('organization_id', user.organizationId)
      .order('expiration_date', { ascending: true, nullsFirst: false })
      .limit(150),
  ])

  const expired = (trainings ?? []).filter((training) => training.status === 'expired').length
  const expiring = (trainings ?? []).filter((training) => training.status === 'expiring_soon').length
  const missing = (trainings ?? []).filter((training) => training.status === 'not_completed').length

  return (
    <div>
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Staff Compliance</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Training & Credentials</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            Track 245D orientation, CPR, background-study related credentials, annual refreshers, and expiration risk.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <Metric label="Expired" value={expired} variant="danger" />
          <Metric label="Expiring" value={expiring} variant="warning" />
          <Metric label="Missing" value={missing} variant="warning" />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div
          className="overflow-hidden rounded-2xl border border-border bg-card"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          {!trainings || trainings.length === 0 ? (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B99A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <p className="text-[13px] font-semibold text-foreground">No training records yet</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Add required staff credentials so audits can flag missing or expired items.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {['Staff', 'Training', 'Completed', 'Expires', 'Status'].map((header) => (
                      <th key={header} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {trainings.map((training: Record<string, unknown>) => {
                    const staffProfile = training.staff_profiles as { full_name: string; email: string } | null
                    const status = String(training.status ?? 'not_completed')
                    return (
                      <tr key={training.id as string} className="transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-semibold text-foreground">{staffProfile?.full_name ?? '-'}</p>
                          <p className="text-[11px] text-muted-foreground">{staffProfile?.email ?? ''}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] text-muted-foreground">{training.training_name as string}</p>
                          <p className="text-[11px] text-muted-foreground">{(training.training_code as string) || ''}</p>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] tabular-nums text-muted-foreground">{(training.completed_date as string) || '—'}</td>
                        <td className="px-5 py-3.5 text-[12px] tabular-nums text-muted-foreground">{(training.expiration_date as string) || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_CLASS[status] ?? 'bg-muted text-muted-foreground'}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? 'bg-gray-400'}`} />
                            {status.replaceAll('_', ' ')}
                          </span>
                          <TrainingStatusForm trainingId={training.id as string} status={status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <TrainingForm staff={(staff ?? []) as Array<{ id: string; full_name: string }>} />
      </div>
    </div>
  )
}

function Metric({ label, value, variant }: { label: string; value: number; variant: 'danger' | 'warning' }) {
  const isAlert = value > 0
  const styles = {
    danger:  { border: isAlert ? 'border-red-100' : 'border-border', num: isAlert ? 'text-red-600' : 'text-foreground', bar: 'bg-red-500' },
    warning: { border: isAlert ? 'border-amber-100' : 'border-border', num: isAlert ? 'text-amber-600' : 'text-foreground', bar: 'bg-amber-500' },
  }[variant]

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-card px-4 py-3 text-center ${styles.border}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {isAlert && <div className={`absolute inset-y-0 left-0 w-[3px] rounded-l-2xl ${styles.bar}`} />}
      <p className={`text-2xl font-bold tracking-tight ${styles.num}`}>{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    </div>
  )
}
