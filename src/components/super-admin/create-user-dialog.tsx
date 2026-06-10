'use client'

import { useState } from 'react'
import { createUser } from '@/lib/super-admin/user-actions'
import { RoleBadge } from '@/components/super-admin/stat-card'

type OrgOption = { id: string; name: string }

type Props = {
  organizations: OrgOption[]
}

export function CreateUserDialog({ organizations: orgs }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ email: string; temporaryPassword: string } | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [orgId, setOrgId] = useState('')




  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)

    const res = await createUser({ firstName, lastName, email, role, organizationId: orgId })
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else if (res.data) {
      setResult(res.data)
    }
  }

  function handleClose() {
    if (result) {
      // Refresh the page so the user table picks up the new user
      window.location.reload()
    }
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => { setError(null); setResult(null); setFirstName(''); setLastName(''); setEmail(''); setRole('staff'); setOrgId(''); setOpen(true) }}
        className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01]"
        style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Create User
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#3A2A4A]">Create User Account</h2>
                <p className="mt-0.5 text-[12px] text-[#94A3B8]">Add an org admin, program manager, or staff member</p>
              </div>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-gray-100 hover:text-[#3A2A4A] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[13px] font-semibold text-emerald-800">Account created successfully</p>
                  <div className="mt-3 space-y-2 text-[13px] text-emerald-700">
                    <p><span className="font-semibold">Email:</span> {result.email}</p>
                    <p>
                      <span className="font-semibold">Temporary password:</span>{' '}
                      <code className="rounded-md bg-emerald-100 px-2 py-0.5 text-[12px] font-mono text-emerald-900">
                        {result.temporaryPassword}
                      </code>
                    </p>
                  </div>
                  <p className="mt-3 text-[11px] text-emerald-600">
                    Copy this password — it won&apos;t be shown again. The user will be prompted to change it on first login.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B] mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B] mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B] mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
                    placeholder="jane@agency.org"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B] mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
                  >
                    <option value="org_admin">Org Admin</option>
                    <option value="program_manager">Program Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                  <div className="mt-1.5">
                    <RoleBadge role={role} />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748B] mb-1">Organization</label>
                  <select
                    required
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#E8799E]/20 focus:border-[#E8799E]"
                  >
                    <option value="">Select an organization...</option>
                    {orgs.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-medium text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-semibold text-[#64748B] hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !orgId}
                    className="flex-1 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
