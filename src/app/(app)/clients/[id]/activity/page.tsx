import { notFound } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ClientSubNav } from '@/components/clients/client-subnav'
import { ActivityTimeline } from '@/components/activity-feed/activity-timeline'
import { getClientActivity } from '@/lib/activity-feed'
import { ActivityFilters } from './filters'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }

export default async function ClientActivityPage({ params, searchParams }: Props) {
  const { id } = await params
  const { type } = await searchParams
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) notFound()

  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('legal_name')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: entries } = await getClientActivity(id)

  const activeFilters = type ? type.split(',') : []
  const filtered = activeFilters.length
    ? entries.filter((e) => activeFilters.includes(e.type))
    : entries

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#3A2A4A]">{client.legal_name}</h1>
        <p className="text-sm text-[#64748B] mt-0.5">Activity timeline</p>
      </div>

      <ClientSubNav clientId={id} activeTab="activity" />

      <ActivityFilters activeFilters={activeFilters} total={entries.length} filtered={filtered.length} />

      <ActivityTimeline entries={filtered} />
    </div>
  )
}
