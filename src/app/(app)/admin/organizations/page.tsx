import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type Organization = {
  id: string
  name: string
  plan: string | null
  plan_expires_at: string | null
  created_at: string
}

export default async function OrganizationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, plan, plan_expires_at, created_at')
    .order('created_at', { ascending: false })

  const rows = (organizations ?? []) as Organization[]

  const PLAN_COLORS: Record<string, string> = {
    trial: 'bg-yellow-50 text-yellow-700',
    starter: 'bg-muted text-muted-foreground',
    pro: 'bg-blue-50 text-blue-700',
    enterprise: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Organizations</h1>
        <p className="text-sm text-muted-foreground mt-1">All organizations on the platform.</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Plan</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Expires</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-muted-foreground text-sm">
                  No organizations found.
                </td>
              </tr>
            ) : (
              rows.map((organization) => {
                const plan = organization.plan ?? 'trial'
                return (
                  <tr key={organization.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">{organization.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${PLAN_COLORS[plan] ?? 'bg-muted text-muted-foreground'}`}>
                        {plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {organization.plan_expires_at
                        ? new Date(organization.plan_expires_at).toLocaleDateString('en-US')
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {new Date(organization.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
