import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { StaffDirectoryClient } from './staff-directory-client'

const ROLE_COLORS: Record<string, string> = {
  super_admin:     'bg-blue-100 text-blue-700',
  org_admin:       'bg-blue-100 text-blue-700',
  program_manager: 'bg-indigo-100 text-indigo-700',
  staff:           'bg-muted text-foreground',
}

export default async function StaffDirectoryPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!['program_manager', 'org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  const supabase = await createClient()

  const { data: members } = user.organizationId
    ? await supabase
        .from('organization_members')
        .select('id, full_name, email, role, is_active, created_at')
        .eq('organization_id', user.organizationId)
        .in('role', ['staff', 'program_manager'])
        .order('full_name')
    : { data: [] }

  const allMembers = (members ?? []) as Array<{
    id: string
    full_name: string
    email: string
    role: string
    is_active: boolean
    created_at: string
  }>

  return <StaffDirectoryClient members={allMembers} roleColors={ROLE_COLORS} />
}
