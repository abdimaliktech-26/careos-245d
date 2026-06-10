import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { EditIncidentForm } from '@/components/incidents/edit-incident-form'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditIncidentPage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const { id } = await params
  const supabase = await createClient()

  const { data: incident } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (!incident) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500">Incident not found</p>
        <Link href="/incidents" className="text-sm text-[#E8799E] hover:underline mt-2 inline-block">Back</Link>
      </div>
    )
  }

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, full_name')
    .eq('organization_id', user.organizationId)
    .eq('is_active', true)

  const { data: clients } = await supabase
    .from('clients')
    .select('id, legal_name')
    .eq('organization_id', user.organizationId)
    .eq('is_active', true)

  return (
    <div className="max-w-2xl">
      <Link href={`/incidents/${id}`} className="text-xs text-[#E8799E] hover:underline mb-4 inline-block">← Back to Incident</Link>
      <h1 className="text-2xl font-bold text-[#3A2A4A] mb-6">Edit {incident.incident_number}</h1>
      <EditIncidentForm incident={incident} staff={staff ?? []} clients={clients ?? []} />
    </div>
  )
}
