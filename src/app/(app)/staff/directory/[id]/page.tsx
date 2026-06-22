import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { StaffDetailClient } from './staff-detail-client'

const ROLE_COLORS: Record<string, string> = {
  super_admin:     'bg-blue-100 text-blue-700',
  org_admin:       'bg-blue-100 text-blue-700',
  program_manager: 'bg-indigo-100 text-indigo-700',
  staff:           'bg-muted text-foreground',
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function StaffDetailPage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!['program_manager', 'org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  const { id } = await params
  const supabase = await createClient()

  const { data: member } = await supabase
    .from('organization_members')
    .select('id, full_name, email, role, is_active, created_at')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (!member) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500">Staff member not found.</p>
        <Link href="/staff/directory" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to directory
        </Link>
      </div>
    )
  }

  // Gather active trainings
  const { data: trainings } = await supabase
    .from('staff_trainings')
    .select('id, training_name, training_code, status, completed_date, expiration_date')
    .eq('organization_id', user.organizationId)
    .eq('staff_id', member.id)
    .order('completed_date', { ascending: false })
    .limit(20)

  // Gather recent EVV visits
  const { data: evvVisits } = await supabase
    .from('evv_visits')
    .select('id, service_name, service_date, status, created_at')
    .eq('organization_id', user.organizationId)
    .eq('staff_id', member.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const memberData = member as {
    id: string
    full_name: string
    email: string
    role: string
    is_active: boolean
    created_at: string
  }

  return (
    <StaffDetailClient
      member={memberData}
      trainings={(trainings ?? []) as Array<{
        id: string
        training_name: string
        training_code: string | null
        status: string
        completed_date: string | null
        expiration_date: string | null
      }>}
      evvVisits={(evvVisits ?? []) as Array<{
        id: string
        service_name: string
        service_date: string
        status: string
        created_at: string
      }>}
      roleColors={ROLE_COLORS}
    />
  )
}
