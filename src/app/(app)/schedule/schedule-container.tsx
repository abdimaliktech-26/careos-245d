'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ScheduleWeek } from '@/components/schedule/schedule-week'
import { ScheduleForm } from '@/components/schedule/schedule-form'

type ClientOption = { id: string; legal_name: string }
type ShiftEntry = Record<string, unknown>

type EditEntry = {
  id: string
  client_id: string
  staff_name: string | null
  scheduled_date: string
  start_time: string
  end_time: string
  service_type: string
  status: string
  notes: string | null
}

export function ScheduleContainer({
  schedules,
  mondayStr,
  sundayStr,
  clients,
  editEntry: initialEditEntry,
}: {
  schedules: ShiftEntry[]
  mondayStr: string
  sundayStr: string
  clients: ClientOption[]
  editEntry: Record<string, unknown> | null
}) {
  const router = useRouter()
  const [selectedEntry, setSelectedEntry] = useState<ShiftEntry | null>(null)

  const handleSelectEntry = useCallback((entry: ShiftEntry) => {
    setSelectedEntry(entry)
  }, [])

  const handleCancel = useCallback(() => {
    setSelectedEntry(null)
    router.push('/schedule')
  }, [router])

  const currentEditEntry: EditEntry | null =
    selectedEntry && selectedEntry.id
      ? {
          id: selectedEntry.id as string,
          client_id: selectedEntry.client_id as string,
          staff_name: (selectedEntry.staff_name as string) ?? null,
          scheduled_date: selectedEntry.scheduled_date as string,
          start_time: selectedEntry.start_time as string,
          end_time: selectedEntry.end_time as string,
          service_type: selectedEntry.service_type as string,
          status: (selectedEntry.status as string) ?? 'scheduled',
          notes: (selectedEntry.notes as string) ?? null,
        }
      : (initialEditEntry as EditEntry | null)

  const formKey = currentEditEntry?.id ?? 'create'

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <ScheduleWeek
        schedules={schedules}
        mondayStr={mondayStr}
        sundayStr={sundayStr}
        onSelectEntry={handleSelectEntry}
      />
      <ScheduleForm
        key={formKey}
        clients={clients}
        editEntry={currentEditEntry}
        onCancel={handleCancel}
      />
    </div>
  )
}
