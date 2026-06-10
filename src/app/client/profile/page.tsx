import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-[13px] text-[#64748B]">{label}</span>
      <span className="text-[13px] font-semibold text-[#3A2A4A]">{value}</span>
    </div>
  )
}

export default async function ProfilePage() {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'external_signer') redirect('/auth/login')

  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()

  const roleLabel = user.role.replace(/_/g, ' ')

  return (
    <div className="max-w-lg space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#3A2A4A]">Profile</h1>
        <p className="mt-1 text-[13px] text-[#64748B]">Your account details and preferences.</p>
      </div>

      {/* Avatar card */}
      <div className="care-panel rounded-2xl p-6 flex items-center gap-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
        >
          {initials}
        </div>
        <div>
          <p className="text-lg font-bold text-[#3A2A4A]">{user.fullName}</p>
          <p className="text-[13px] text-[#64748B] capitalize mt-0.5">{roleLabel}</p>
        </div>
      </div>

      {/* Details card */}
      <div className="care-panel rounded-2xl overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-bold text-[#3A2A4A]">Account Details</h2>
        </div>
        <div className="px-6 py-2">
          <InfoRow label="Full Name" value={user.fullName} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Role" value={roleLabel.replace(/\b\w/g, (c) => c.toUpperCase())} />
          <InfoRow label="Status" value={user.isActive ? 'Active' : 'Inactive'} />
        </div>
      </div>

      {/* Support card */}
      <div className="care-panel rounded-2xl p-6">
        <h2 className="text-sm font-bold text-[#3A2A4A] mb-2">Need Help?</h2>
        <p className="text-[12px] text-[#64748B]">
          If you need assistance with signing documents or have any questions, please contact your care provider directly.
        </p>
      </div>
    </div>
  )
}
