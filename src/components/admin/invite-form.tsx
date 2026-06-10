'use client'

import { useActionState } from 'react'
import { inviteTeamMember } from '@/lib/staff-admin/invite-actions'

const initialState = { error: null }

export function InviteForm() {
  const [state, action, isPending] = useActionState(inviteTeamMember, initialState)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Invite</p>
      <h2 className="text-lg font-semibold text-gray-900 mb-5">Add Team Member</h2>

      {state.error === null && !isPending ? null : null}

      <form action={action} className="space-y-4">
        {state.error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        <div>
          <label
            htmlFor="invite-email"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5"
          >
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="invite-email"
            type="email"
            name="email"
            required
            placeholder="colleague@yourorg.com"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
          />
        </div>

        <div>
          <label
            htmlFor="invite-role"
            className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5"
          >
            Role <span className="text-red-500">*</span>
          </label>
          <select
            id="invite-role"
            name="role"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 bg-white"
          >
            <option value="staff">Staff</option>
            <option value="program_manager">Program Manager</option>
            <option value="org_admin">Organization Admin</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#8B4B2D' }}
        >
          {isPending ? 'Sending…' : 'Send Invite'}
        </button>

        <p className="text-xs text-gray-400">
          The invitee receives a magic-link email. They are assigned the chosen role on first sign-in.
        </p>
      </form>
    </div>
  )
}
