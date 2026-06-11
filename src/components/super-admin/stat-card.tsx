interface StatCardProps {
  label: string
  value: number | string
  iconBg: string
  iconColor: string
  children: React.ReactNode
}

export function StatCard({ label, value, iconBg, iconColor, children }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: iconBg }}>
          <span style={{ color: iconColor }}>{children}</span>
        </div>
      </div>
      <p className="text-[30px] font-bold leading-none tracking-tight text-foreground">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; dot: string; label: string }> = {
    active:    { bg: 'bg-status-ok-bg text-status-ok', dot: 'bg-emerald-500', label: 'Active' },
    pending:   { bg: 'bg-status-warn-bg text-status-warn',     dot: 'bg-amber-500',  label: 'Pending' },
    suspended: { bg: 'bg-status-error-bg text-status-error',         dot: 'bg-red-500',    label: 'Suspended' },
    trial:     { bg: 'bg-status-warn-bg text-status-warn',   dot: 'bg-yellow-500', label: 'Trial' },
  }
  const s = map[status] ?? { bg: 'bg-muted text-muted-foreground', dot: 'bg-gray-400', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    super_admin:     'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    org_admin:       'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    program_manager: 'bg-teal-50 text-teal-700',
    staff:           'bg-muted text-muted-foreground',
    external_signer: 'bg-status-warn-bg text-status-warn',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[role] ?? 'bg-muted text-muted-foreground'}`}>
      {role.replace(/_/g, ' ')}
    </span>
  )
}

export function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    login: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    logout: 'bg-muted text-muted-foreground',
    client_created: 'bg-status-ok-bg text-status-ok',
    client_updated: 'bg-status-warn-bg text-status-warn',
    form_saved: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    form_submitted: 'bg-purple-100 text-purple-800',
    signature_completed: 'bg-teal-50 text-teal-700',
    pdf_downloaded: 'bg-status-warn-bg text-status-warn',
    file_uploaded: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    incident_submitted: 'bg-status-error-bg text-status-error',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${colors[action] ?? 'bg-muted text-muted-foreground'}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}
