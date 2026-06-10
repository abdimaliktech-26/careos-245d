'use client'

import { useRouter } from 'next/navigation'
import { updateScheduleStatus } from '@/lib/schedule/actions'

const STATUS_STYLE: Record<string, string> = {
  scheduled:  'bg-[#EEF2FF] text-[#E8799E] border-[#C7D2FE]',
  completed:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-gray-50 text-gray-400 border-gray-200 line-through',
  no_show:    'bg-red-50 text-red-600 border-red-200',
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function addDays(isoDate: string, n: number) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type ShiftEntry = Record<string, unknown>

interface Props {
  schedules: ShiftEntry[]
  mondayStr: string
  sundayStr: string
  onSelectEntry?: (entry: ShiftEntry) => void
}

export function ScheduleWeek({ schedules, mondayStr, sundayStr, onSelectEntry }: Props) {
  const router = useRouter()

  const days = Array.from({ length: 7 }, (_, i) => addDays(mondayStr, i))

  const prevWeek = addDays(mondayStr, -7)
  const nextWeek = addDays(mondayStr, 7)

  async function handleStatusChange(id: string, status: string) {
    await updateScheduleStatus(id, status)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Week nav */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          onClick={() => router.push(`/schedule?week=${prevWeek}`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-[#111827]">
          {formatDate(mondayStr)} — {formatDate(sundayStr)}
        </p>
        <button
          onClick={() => router.push(`/schedule?week=${nextWeek}`)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
        >
          ›
        </button>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[400px]">
        {days.map((dayIso, idx) => {
          const daySchedules = schedules.filter((s) => s.scheduled_date === dayIso)
          const isToday = dayIso === new Date().toISOString().slice(0, 10)

          return (
            <div key={dayIso} className="flex flex-col">
              {/* Day header */}
              <div className={`px-2 py-2.5 text-center border-b border-gray-100 ${isToday ? 'bg-[#EEF2FF]' : 'bg-gray-50'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-[#E8799E]' : 'text-gray-400'}`}>
                  {DAY_NAMES[idx]}
                </p>
                <p className={`text-sm font-black mt-0.5 ${isToday ? 'text-[#E8799E]' : 'text-[#111827]'}`}>
                  {new Date(dayIso + 'T00:00:00').getDate()}
                </p>
              </div>

              {/* Shifts */}
              <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
                {daySchedules.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-[10px] text-gray-300">—</p>
                  </div>
                ) : (
                  daySchedules.map((s) => {
                    const client = s.clients as { legal_name: string } | null
                    const status = String(s.status ?? 'scheduled')
                    const start  = String(s.start_time ?? '').slice(0, 5)
                    const end    = String(s.end_time ?? '').slice(0, 5)
                    const hasConflict = !!(s as Record<string, unknown>).conflict
                    return (
                      <div
                        key={s.id as string}
                        onClick={() => onSelectEntry?.(s)}
                        className={`rounded-lg border p-1.5 text-[10px] leading-tight cursor-pointer transition hover:shadow-md ${STATUS_STYLE[status] ?? STATUS_STYLE.scheduled}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold truncate">{client?.legal_name ?? '—'}</p>
                          {hasConflict && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">
                              !
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 opacity-70">{start}–{end}</p>
                        {!!s.staff_name && <p className="mt-0.5 opacity-60 truncate">{String(s.staff_name)}</p>}
                        {status === 'scheduled' && (
                          <div className="mt-1.5 flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleStatusChange(s.id as string, 'completed')}
                              className="rounded px-1 py-0.5 text-[9px] font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition"
                            >
                              Done
                            </button>
                            <button
                              onClick={() => handleStatusChange(s.id as string, 'no_show')}
                              className="rounded px-1 py-0.5 text-[9px] font-semibold bg-red-100 text-red-600 hover:bg-red-200 transition"
                            >
                              No show
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
