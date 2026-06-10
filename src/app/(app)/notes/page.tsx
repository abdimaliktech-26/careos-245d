import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { NotesClient } from './notes-client'

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const params = await searchParams

  const supabase = await createClient()

  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [{ data: clients }, { data: notes }, { count: todayCount }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, legal_name')
      .eq('organization_id', user.organizationId ?? '')
      .order('legal_name'),
    supabase
      .from('shift_notes')
      .select('*')
      .eq('organization_id', user.organizationId ?? '')
      .order('created_at', { ascending: false }),
    supabase
      .from('shift_notes')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', user.organizationId ?? '')
      .gte('created_at', today),
  ])

  const weekNotes = (notes ?? []).filter((n: Record<string, unknown>) =>
    n.created_at && typeof n.created_at === 'string' && n.created_at >= weekAgo
  )

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8799E]">Daily Documentation</p>
          <h1 className="mt-2 text-3xl font-black text-[#3A2A4A]">T-Log / Shift Notes</h1>
          <p className="mt-2 text-sm text-gray-500">
            DSPs document every visit — what was done, client mood, goals addressed, activities.
          </p>
        </div>
        <div className="flex gap-3">
          <Stat label="Today" value={todayCount ?? 0} />
          <Stat label="This week" value={weekNotes.length} />
          <Stat label="Total" value={(notes ?? []).length} />
        </div>
      </div>

      <NotesClient
        notes={(notes ?? []) as Array<Record<string, unknown>>}
        clients={(clients ?? []) as Array<{ id: string; legal_name: string }>}
        initialClientFilter={params.clientId ?? null}
      />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-3 text-center min-w-[80px]">
      <p className="text-2xl font-black text-[#3A2A4A]">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
    </div>
  )
}
