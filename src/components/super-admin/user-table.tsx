'use client'

import { useState } from 'react'
import type { UserListItem } from '@/lib/super-admin/actions'
import { RoleBadge } from '@/components/super-admin/stat-card'
import { updateUserRole, toggleUserActive } from '@/lib/super-admin/user-actions'

export function UserTable({ users }: { users: UserListItem[] }) {
  const [actingId, setActingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRoleChange(memberId: string, newRole: string) {
    setActingId(memberId)
    setError(null)
    const res = await updateUserRole(memberId, newRole)
    setActingId(null)
    if (res.error) setError(res.error)
  }

  async function handleToggleActive(memberId: string) {
    setActingId(memberId)
    setError(null)
    const res = await toggleUserActive(memberId)
    setActingId(null)
    if (res.error) setError(res.error)
  }

  if (users.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-[13px] font-semibold text-[#3A2A4A]">No users found</p>
        <p className="mt-1 text-[12px] text-[#94A3B8]">Create users or invite them to organizations.</p>
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-medium text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-600">Dismiss</button>
        </div>
      )}
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            {['Name', 'Email', 'Role', 'Organization', 'Status', 'Joined', 'Actions'].map((h) => (
              <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94A3B8]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map((u) => (
            <tr key={u.id} className="transition-colors hover:bg-gray-50/60">
              <td className="px-5 py-3.5 text-[13px] font-medium text-[#3A2A4A]">{u.fullName ?? '—'}</td>
              <td className="px-5 py-3.5 text-[12px] text-[#64748B]">{u.email ?? '—'}</td>
              <td className="px-5 py-3.5">
                {u.role === 'super_admin' ? (
                  <RoleBadge role={u.role} />
                ) : (
                  <select
                    value={u.role}
                    disabled={actingId === u.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-[#3A2A4A] focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E] disabled:opacity-50"
                  >
                    <option value="org_admin">Org Admin</option>
                    <option value="program_manager">Program Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                )}
              </td>
              <td className="px-5 py-3.5 text-[12px] text-[#64748B]">{u.organizationName ?? '—'}</td>
              <td className="px-5 py-3.5">
                {u.role === 'super_admin' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => handleToggleActive(u.id)}
                    disabled={actingId === u.id}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-50 ${
                      u.isActive
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                    {u.isActive ? 'Active' : 'Inactive'}
                  </button>
                )}
              </td>
              <td className="px-5 py-3.5 text-[12px] text-[#94A3B8]">
                {new Date(u.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
              <td className="px-5 py-3.5">
                {actingId === u.id && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8]">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    Saving
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
