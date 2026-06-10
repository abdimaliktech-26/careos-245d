import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ClientIncidentsPage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, legal_name')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (!client) return <p className="p-8 text-sm text-gray-500">Client not found.</p>

  const { data: incidents } = await supabase
    .from('incidents')
    .select('*')
    .eq('client_id', id)
    .order('occurred_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <Link href={`/clients/${id}`} className="text-xs text-[#E8799E] hover:underline mb-1 inline-block">← Back to {client.legal_name}</Link>
        <h1 className="text-2xl font-bold text-[#3A2A4A]">Incidents — {client.legal_name}</h1>
      </div>

      {(incidents ?? []).length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-sm text-gray-400">No incidents for this client.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div className="divide-y divide-gray-50">
            {(incidents ?? []).map((inc) => (
              <Link key={inc.id} href={`/incidents/${inc.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#3A2A4A]">{inc.incident_number}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      inc.status === 'open' ? 'bg-blue-50 text-blue-700' :
                      inc.status === 'under_review' ? 'bg-amber-50 text-amber-700' :
                      inc.status === 'reported_to_state' ? 'bg-red-50 text-red-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {inc.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {inc.category.replace(/_/g, ' ')} · {new Date(inc.occurred_at).toLocaleDateString('en-US')}
                    {inc.location && ` · ${inc.location}`}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
