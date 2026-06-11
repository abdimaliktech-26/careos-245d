import type { AuditLogEntry } from '@/lib/super-admin/actions'
import { ActionBadge } from '@/components/super-admin/stat-card'

export function AuditLogTable({ entries }: { entries: AuditLogEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-[13px] font-semibold text-foreground">No audit log entries found</p>
        <p className="mt-1 text-[12px] text-muted-foreground">Activity across all organizations will appear here.</p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border bg-muted/40">
          {['Time', 'User', 'Action', 'Resource', 'Organization', 'IP'].map((h) => (
            <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {entries.map((entry) => (
          <tr key={entry.id} className="transition-colors hover:bg-muted/40">
            <td className="px-5 py-3 text-[12px] text-muted-foreground whitespace-nowrap">
              {new Date(entry.createdAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </td>
            <td className="px-5 py-3 text-[12px] text-foreground">{entry.userEmail ?? '—'}</td>
            <td className="px-5 py-3"><ActionBadge action={entry.action} /></td>
            <td className="px-5 py-3 text-[12px] text-muted-foreground">
              {entry.entityLabel ?? entry.entityId ? `${entry.entityId?.slice(0, 8)}...` : '—'}
            </td>
            <td className="px-5 py-3 text-[12px] text-muted-foreground">{entry.organizationName ?? entry.organizationId?.slice(0, 8) ?? '—'}</td>
            <td className="px-5 py-3 text-[11px] font-mono text-muted-foreground">{entry.ipAddress ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
