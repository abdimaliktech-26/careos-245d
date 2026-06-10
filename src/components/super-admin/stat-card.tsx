interface StatCardProps {
  label: string
  value: number | string
  iconBg: string
  iconColor: string
  children: React.ReactNode
}

export function StatCard({ label, value, iconBg, iconColor, children }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: iconBg }}>
          <span style={{ color: iconColor }}>{children}</span>
        </div>
      </div>
      <p className="text-[30px] font-bold leading-none tracking-tight text-[#3A2A4A]">{value}</p>
      <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{label}</p>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; dot: string; label: string }> = {
    active:    { bg: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Active' },
    pending:   { bg: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500',  label: 'Pending' },
    suspended: { bg: 'bg-red-50 text-red-700',         dot: 'bg-red-500',    label: 'Suspended' },
    trial:     { bg: 'bg-yellow-50 text-yellow-700',   dot: 'bg-yellow-500', label: 'Trial' },
  }
  const s = map[status] ?? { bg: 'bg-gray-100 text-gray-500', dot: 'bg-gray-400', label: status }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    super_admin:     'bg-purple-50 text-purple-700',
    org_admin:       'bg-blue-50 text-blue-700',
    program_manager: 'bg-teal-50 text-teal-700',
    staff:           'bg-gray-100 text-gray-600',
    external_signer: 'bg-orange-50 text-orange-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[role] ?? 'bg-gray-100 text-gray-600'}`}>
      {role.replace(/_/g, ' ')}
    </span>
  )
}

export function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    login: 'bg-blue-50 text-blue-700',
    logout: 'bg-gray-100 text-gray-600',
    client_created: 'bg-green-50 text-green-700',
    client_updated: 'bg-yellow-50 text-yellow-700',
    form_saved: 'bg-purple-50 text-purple-700',
    form_submitted: 'bg-purple-100 text-purple-800',
    signature_completed: 'bg-teal-50 text-teal-700',
    pdf_downloaded: 'bg-orange-50 text-orange-700',
    file_uploaded: 'bg-indigo-50 text-indigo-700',
    incident_submitted: 'bg-red-50 text-red-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${colors[action] ?? 'bg-gray-100 text-gray-600'}`}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}
