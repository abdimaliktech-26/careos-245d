import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { ScheduleForm } from '@/components/schedule/schedule-form'
import { ScheduleWeek } from '@/components/schedule/schedule-week'
import { ScheduleContainer } from './schedule-container'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; edit?: string }>
}) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!user.organizationId) redirect('/dashboard')

  const params = await searchParams

  // Anchor to the Monday of the requested or current week
  const anchor = params.week ? new Date(params.week) : new Date()
  const dayOfWeek = anchor.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(anchor)
  monday.setDate(anchor.getDate() + diff)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const mondayStr = monday.toISOString().slice(0, 10)
  const sundayStr = sunday.toISOString().slice(0, 10)

  const supabase = await createClient()

  const [{ data: clients }, { data: schedules }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, legal_name')
      .eq('organization_id', user.organizationId)
      .eq('status', 'active')
      .order('legal_name'),
    supabase
      .from('schedules')
      .select('id, scheduled_date, start_time, end_time, service_type, status, staff_name, notes, clients(legal_name)')
      .eq('organization_id', user.organizationId)
      .gte('scheduled_date', mondayStr)
      .lte('scheduled_date', sundayStr)
      .order('scheduled_date')
      .order('start_time'),
  ])

  // Fetch edit entry if edit param present
  let editEntry = null
  if (params.edit) {
    const { data } = await supabase
      .from('schedules')
      .select('id, client_id, staff_name, scheduled_date, start_time, end_time, service_type, status, notes')
      .eq('id', params.edit)
      .eq('organization_id', user.organizationId)
      .single()
    if (data) editEntry = data
  }

  const scheduled = (schedules ?? []).filter((s) => s.status === 'scheduled').length
  const completed = (schedules ?? []).filter((s) => s.status === 'completed').length
  const noShows   = (schedules ?? []).filter((s) => s.status === 'no_show').length

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8799E]">Staff Scheduling</p>
          <h1 className="mt-2 text-3xl font-black text-[#111827]">Schedule</h1>
          <p className="mt-2 text-sm text-gray-500">Weekly shift calendar — assign staff to clients, track completions.</p>
        </div>
        <div className="flex gap-3">
          <Stat label="Scheduled" value={scheduled} color="text-[#E8799E]" />
          <Stat label="Completed" value={completed} color="text-green-600" />
          <Stat label="No shows" value={noShows}   color="text-red-500" />
        </div>
      </div>

      <ScheduleContainer
        schedules={(schedules ?? []) as Array<Record<string, unknown>>}
        mondayStr={mondayStr}
        sundayStr={sundayStr}
        clients={(clients ?? []) as Array<{ id: string; legal_name: string }>}
        editEntry={editEntry as Record<string, unknown> | null}
      />
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm px-5 py-3 text-center min-w-[80px]">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</p>
    </div>
  )
}
