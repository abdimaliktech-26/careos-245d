'use client'

import Link from 'next/link'

type Member = {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

type Training = {
  id: string
  training_name: string
  training_code: string | null
  status: string
  completed_date: string | null
  expiration_date: string | null
}

type EvvVisit = {
  id: string
  service_name: string
  service_date: string
  status: string
  created_at: string
}

type Props = {
  member: Member
  trainings: Training[]
  evvVisits: EvvVisit[]
  roleColors: Record<string, string>
}

const STATUS_BADGE: Record<string, string> = {
  current: 'bg-status-ok-bg text-status-ok',
  expiring_soon: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  not_completed: 'bg-muted text-muted-foreground',
}

const EVV_STATUS: Record<string, string> = {
  completed: 'text-green-700',
  in_progress: 'text-blue-700',
  scheduled: 'text-muted-foreground',
  missed: 'text-red-600',
  exception: 'text-amber-600',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function StaffDetailClient({ member, trainings, evvVisits, roleColors }: Props) {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/staff/directory" className="text-xs font-semibold text-muted-foreground hover:text-muted-foreground transition-colors">
          &larr; Staff Directory
        </Link>
      </div>

      {/* Profile card */}
      <div className="care-panel rounded-2xl p-6 mb-6 border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
              {(member.full_name || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{member.full_name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{member.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColors[member.role] ?? 'bg-muted text-muted-foreground'}`}>
              {member.role.replace('_', ' ').toUpperCase()}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${member.is_active ? 'text-green-700' : 'text-red-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
              {member.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Member Since</p>
            <p className="text-foreground mt-0.5">{formatDate(member.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Member ID</p>
            <p className="text-foreground mt-0.5 font-mono text-xs">{member.id}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Trainings */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Trainings ({trainings.length})
            </h2>
            <Link
              href="/admin/trainings"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Manage
            </Link>
          </div>
          {trainings.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No training records.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {trainings.map((t) => (
                <div key={t.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{t.training_name}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[t.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {t.training_code && (
                      <span className="text-[11px] font-mono text-muted-foreground">{t.training_code}</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      Completed: {formatDate(t.completed_date)}
                    </span>
                    {t.expiration_date && (
                      <span className="text-[11px] text-muted-foreground">
                        Expires: {formatDate(t.expiration_date)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent EVV Visits */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              Recent EVV Visits ({evvVisits.length})
            </h2>
          </div>
          {evvVisits.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">No EVV visits recorded.</div>
          ) : (
            <div className="divide-y divide-border/60">
              {evvVisits.map((v) => (
                <div key={v.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{v.service_name}</p>
                    <span className={`text-xs font-semibold ${EVV_STATUS[v.status] ?? 'text-muted-foreground'}`}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {formatDate(v.service_date)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
