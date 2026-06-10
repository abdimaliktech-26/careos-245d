import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { getOrganizationDetail } from '@/lib/super-admin/actions'
import { StatusBadge, RoleBadge } from '@/components/super-admin/stat-card'
import { OrgActions } from './org-actions'
import { SubscriptionForm } from './subscription-form'

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') redirect('/auth/login')

  const { id } = await params
  const org = await getOrganizationDetail(id)

  if (!org) {
    return (
      <div className="py-16 text-center">
        <p className="text-[13px] font-semibold text-[#3A2A4A]">Organization not found</p>
        <Link href="/super-admin/organizations" className="mt-2 text-[12px] text-[#E8799E] hover:underline inline-block">
          ← Back to organizations
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link href="/super-admin/organizations" className="text-[12px] text-[#E8799E] hover:opacity-80 transition-opacity">
          ← Organizations
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">Organization</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-[#3A2A4A]">{org.name}</h1>
          <div className="mt-2 flex items-center gap-3">
            <StatusBadge status={org.status} />
            {org.plan && (
              <span className="text-[12px] capitalize text-[#64748B]">Plan: {org.plan}</span>
            )}
            {org.planExpiresAt && (
              <span className="text-[12px] text-[#64748B]">
                Expires: {new Date(org.planExpiresAt).toLocaleDateString('en-US')}
              </span>
            )}
          </div>
        </div>
        <OrgActions orgId={org.id} status={org.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Org info */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">Details</p>
          <h2 className="mt-0.5 text-[13px] font-bold text-[#3A2A4A] mb-4">Organization Info</h2>
          <dl className="space-y-3">
            {[
              ['License', org.licenseNumber],
              ['Address', org.address],
              ['City', org.city],
              ['State', org.state],
              ['ZIP', org.zip],
              ['Phone', org.phone],
              ['Email', org.email],
              ['Website', org.website],
              ['Onboarding', org.onboardingCompleted ? 'Completed' : 'Not completed'],
              ['Created', new Date(org.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94A3B8]">{label as string}</dt>
                <dd className="text-[12px] text-[#3A2A4A] text-right ml-4">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Quick stats */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">Analytics</p>
          <h2 className="mt-0.5 text-[13px] font-bold text-[#3A2A4A] mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-[12px] text-[#64748B]">Total Clients</span>
              <span className="text-[15px] font-bold text-[#3A2A4A]">{org.stats.clientCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-[12px] text-[#64748B]">Active Clients</span>
              <span className="text-[15px] font-bold text-[#3A2A4A]">{org.stats.activeClientCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-[12px] text-[#64748B]">Packets</span>
              <span className="text-[15px] font-bold text-[#3A2A4A]">{org.stats.packetCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-[12px] text-[#64748B]">Incidents</span>
              <span className="text-[15px] font-bold text-[#3A2A4A]">{org.stats.incidentCount}</span>
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="lg:col-span-1 overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">Team</p>
            <h2 className="mt-0.5 text-[13px] font-bold text-[#3A2A4A]">Members ({org.members.length})</h2>
          </div>
          {org.members.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[12px] text-[#94A3B8]">No members in this organization.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {org.members.map((member) => (
                <div key={member.id} className="px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-[#3A2A4A] truncate">{member.fullName ?? 'Unknown'}</p>
                      <p className="text-[11px] text-[#94A3B8] truncate">{member.email ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <RoleBadge role={member.role} />
                      <span className={`h-2 w-2 rounded-full ${member.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subscription & Branding */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SubscriptionForm
          orgId={org.id}
          currentPlan={org.plan}
          currentExpiresAt={org.planExpiresAt}
          currentPrice={org.subscriptionPrice}
          stripeCustomerId={org.stripeCustomerId}
        />

        {/* Branding info */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94A3B8]">Branding</p>
          <h2 className="mt-0.5 text-[13px] font-bold text-[#3A2A4A] mb-4">Portal Colors</h2>
          <div className="space-y-3">
            {[['Primary', org.brandPrimary], ['Accent', org.brandAccent]].map(([label, color]) => (
              <div key={label as string} className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#64748B]">{label as string}</span>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-[#3A2A4A] font-mono">{color}</span>
                </div>
              </div>
            ))}
            {org.logoUrl && (
              <div className="pt-2 border-t border-gray-100">
                <span className="text-[11px] font-semibold text-[#64748B] block mb-1.5">Logo</span>
                <img src={org.logoUrl} alt="" className="h-10 w-10 rounded-lg object-contain border border-gray-200" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
