'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type Member = {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

type Props = {
  members: Member[]
  roleColors: Record<string, string>
}

export function StaffDirectoryClient({ members, roleColors }: Props) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const filtered = useMemo(
    () => members.filter((m) => {
      const matchSearch =
        !search ||
        m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
      const matchRole = roleFilter === 'all' || m.role === roleFilter
      return matchSearch && matchRole
    }),
    [members, search, roleFilter]
  )

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">
            Staff
          </p>
          <h1 className="text-3xl font-bold text-foreground">Staff Directory</h1>
          <p className="text-muted-foreground mt-1">
            View all staff and program managers across your organization.
          </p>
        </div>
        <Link
          href="/admin/team"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity shrink-0"
        >
          Invite Staff
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
        >
          <option value="all">All Roles</option>
          <option value="staff">Staff</option>
          <option value="program_manager">Program Manager</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {search || roleFilter !== 'all'
              ? 'No staff match your filters.'
              : 'No staff members yet.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                {['NAME', 'EMAIL', 'ROLE', 'STATUS', 'MEMBER SINCE'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className="border-b border-gray-50 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/staff/directory/${m.id}`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {m.full_name || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{m.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColors[m.role] ?? 'bg-muted text-muted-foreground'}`}>
                      {m.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${m.is_active ? 'text-green-700' : 'text-red-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${m.is_active ? 'bg-green-500' : 'bg-red-400'}`} />
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDate(m.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
