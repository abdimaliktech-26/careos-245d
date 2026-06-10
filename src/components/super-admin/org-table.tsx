import Link from 'next/link'
import type { OrgListItem } from '@/lib/super-admin/actions'
import { StatusBadge } from '@/components/super-admin/stat-card'

export function OrgTable({ orgs }: { orgs: OrgListItem[] }) {
  if (orgs.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-[13px] font-semibold text-[#3A2A4A]">No organizations found</p>
        <p className="mt-1 text-[12px] text-[#94A3B8]">Create your first organization to get started.</p>
      </div>
    )
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/50">
          {['Name', 'Status', 'Plan', 'Members', 'Clients', 'Created'].map((h) => (
            <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {orgs.map((org) => (
          <tr key={org.id} className="transition-colors hover:bg-gray-50/60">
            <td className="px-5 py-3.5">
              <Link href={`/super-admin/organizations/${org.id}`} className="text-[13px] font-semibold text-[#3A2A4A] hover:text-[#E8799E]">
                {org.name}
              </Link>
            </td>
            <td className="px-5 py-3.5"><StatusBadge status={org.status} /></td>
            <td className="px-5 py-3.5 text-[12px] capitalize text-[#64748B]">{org.plan ?? '—'}</td>
            <td className="px-5 py-3.5 text-[13px] text-[#64748B]">{org.memberCount}</td>
            <td className="px-5 py-3.5 text-[13px] text-[#64748B]">{org.clientCount}</td>
            <td className="px-5 py-3.5 text-[12px] text-[#94A3B8]">
              {new Date(org.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
