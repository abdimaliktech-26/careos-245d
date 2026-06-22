import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { AuditTabs } from '@/components/audit-readiness/audit-tabs'
import { AuditWizard } from '@/components/audit-readiness/audit-wizard'

export default async function AuditWizardPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  const organizationId = user.organizationId

  let counts = { clients: 0, staff: 0, incidents: 0 }
  let organizationName = ''

  if (organizationId) {
    const supabase = await createClient()
    const [{ count: clients }, { count: staff }, { count: incidents }, { data: org }] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('staff_profiles').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('is_active', true),
      supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'closed'),
      supabase.from('organizations').select('name').eq('id', organizationId).single(),
    ])
    counts = { clients: clients ?? 0, staff: staff ?? 0, incidents: incidents ?? 0 }
    organizationName = org?.name ?? ''
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Audit Review Wizard</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">A guided, six-step audit you can run before any licensing or payer review.</p>
      </div>

      <AuditTabs />
      <AuditWizard organizationName={organizationName} counts={counts} />
    </div>
  )
}
