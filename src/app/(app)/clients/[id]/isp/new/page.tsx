import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { PlanForm } from '@/components/isp/plan-form'

export default async function NewIspPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, error } = await getSession()
  if (error || !user || !['program_manager', 'org_admin', 'super_admin'].includes(user.role)) redirect(`/clients/${id}/isp`)
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-foreground">New Service Plan</h1>
      <PlanForm clientId={id} />
    </div>
  )
}
