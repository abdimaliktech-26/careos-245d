import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { CreateOrgForm } from '@/components/super-admin/org-form'

export default async function NewOrganizationPage() {
  const { user, error } = await getSession()
  if (error || !user || user.role !== 'super_admin') redirect('/auth/login')

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Super Admin</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">Create Organization</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Add a new organization to the platform.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <CreateOrgForm />
      </div>
    </div>
  )
}
