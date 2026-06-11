import Link from 'next/link'
import type { OrgListItem } from '@/lib/super-admin/actions'
import { StatusBadge } from '@/components/super-admin/stat-card'

export function OrgTable({ orgs }: { orgs: OrgListItem[] }) {
  if (orgs.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-[13px] font-semibold text-foreground">No organizations found</p>
        <p className="mt-1 text-[12px] text-muted-foreground">Create your first organization to get started.</p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border bg-muted/40">
          {['Name', 'Status', 'Plan', 'Members', 'Clients', 'Created'].map((h) => (
            <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {orgs.map((org) => (
          <tr key={org.id} className="transition-colors hover:bg-muted/40">
            <td className="px-5 py-3.5">
              <Link href={`/super-admin/organizations/${org.id}`} className="text-[13px] font-semibold text-foreground hover:text-primary">
                {org.name}
              </Link>
            </td>
            <td className="px-5 py-3.5"><StatusBadge status={org.status} /></td>
            <td className="px-5 py-3.5 text-[12px] capitalize text-muted-foreground">{org.plan ?? '—'}</td>
            <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{org.memberCount}</td>
            <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{org.clientCount}</td>
            <td className="px-5 py-3.5 text-[12px] text-muted-foreground">
              {new Date(org.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
