import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { NewStaffForm } from '@/components/admin/new-staff-form'

type OrganizationOption = {
  id: string
  name: string
}

export default async function NewStaffPage() {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin'].includes(user.role)) redirect('/auth/login')

  const supabase = await createClient()
  const { data: organizations } = user.role === 'super_admin'
    ? await supabase
        .from('organizations')
        .select('id, name')
        .order('name')
    : { data: [] }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Staff Member</h1>
      <NewStaffForm
        isSuperAdmin={user.role === 'super_admin'}
        organizations={(organizations ?? []) as OrganizationOption[]}
      />
    </div>
  )
}
