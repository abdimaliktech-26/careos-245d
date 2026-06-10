import type { AuditLogEntry } from '@/lib/super-admin/actions'
import { ActionBadge } from '@/components/super-admin/stat-card'

export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-[13px] font-semibold text-[#3A2A4A]">No audit log entries found</p>
        <p className="mt-1 text-[12px] text-[#94A3B8]">Activity across all organizations will appear here.</p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          {['Time', 'User', 'Action', 'Resource', 'Organization', 'IP'].map((h) => (
            <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {entries.map((entry) => (
          <tr key={entry.id} className="transition-colors hover:bg-gray-50/60">
            <td className="px-5 py-3 text-[12px] text-[#64748B] whitespace-nowrap">
              {new Date(entry.createdAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </td>
            <td className="px-5 py-3 text-[12px] text-[#3A2A4A]">{entry.userEmail ?? '—'}</td>
            <td className="px-5 py-3"><ActionBadge action={entry.action} /></td>
            <td className="px-5 py-3 text-[12px] text-[#64748B]">
              {entry.entityLabel ?? entry.entityId ? `${entry.entityId?.slice(0, 8)}...` : '—'}
            </td>
            <td className="px-5 py-3 text-[12px] text-[#94A3B8]">{entry.organizationName ?? entry.organizationId?.slice(0, 8) ?? '—'}</td>
            <td className="px-5 py-3 text-[11px] font-mono text-[#94A3B8]">{entry.ipAddress ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
