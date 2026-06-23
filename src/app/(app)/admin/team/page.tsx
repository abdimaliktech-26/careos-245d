import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { InviteForm } from '@/components/admin/invite-form'

const ROLE_COLORS: Record<string, string> = {
  super_admin:     'bg-blue-100 text-blue-700',
  org_admin:       'bg-blue-100 text-blue-700',
  program_manager: 'bg-emerald-100 text-emerald-700',
  staff:           'bg-muted text-foreground',
  external_signer: 'bg-green-100 text-green-700',
}

export default async function TeamPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const supabase = await createClient()

  const { data: members } = user.organizationId
    ? await supabase
        .from('organization_members')
        .select('id, full_name, email, role, is_active')
        .eq('organization_id', user.organizationId)
        .eq('is_active', true)
        .order('role')
        .order('full_name')
    : { data: [] }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">
          Team Management
        </p>
        <h1 className="text-3xl font-bold text-foreground">Team &amp; Invites</h1>
        <p className="text-muted-foreground mt-1">
          Invite colleagues by email. They are assigned the chosen role on first sign-in.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Members list */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">
              Active Members ({members?.length ?? 0})
            </h2>
          </div>
          {!members || members.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground text-sm">No members yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted">
                  {['NAME', 'EMAIL', 'ROLE'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-muted-foreground tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {members.map((m: Record<string, unknown>) => (
                  <tr key={m.id as string} className="border-b border-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {m.full_name as string}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{m.email as string}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[m.role as string] ?? 'bg-muted text-muted-foreground'}`}>
                        {(m.role as string).replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Invite form — client component with useActionState */}
        <InviteForm />
      </div>
    </div>
  )
}
