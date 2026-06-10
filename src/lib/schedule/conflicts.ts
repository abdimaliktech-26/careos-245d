type ScheduleEntry = {
  id: string
  staff_name: string | null
  scheduled_date: string
  start_time: string
  end_time: string
}

type Conflict = {
  date: string
  existingId: string
  existingStaff: string | null
  existingStart: string
  existingEnd: string
  message: string
}

export function detectConflicts(
  staffName: string,
  date: string,
  startTime: string,
  endTime: string,
  existing: ScheduleEntry[]
): Conflict[] {
  if (existing.length === 0) return []

  const conflicts: Conflict[] = []

  for (const entry of existing) {
    if (!entry.staff_name) continue
    if (entry.staff_name.toLowerCase() !== staffName.toLowerCase()) continue
    if (entry.scheduled_date !== date) continue

    if (timesOverlap(startTime, endTime, entry.start_time, entry.end_time)) {
      conflicts.push({
        date: entry.scheduled_date,
        existingId: entry.id,
        existingStaff: entry.staff_name,
        existingStart: entry.start_time,
        existingEnd: entry.end_time,
        message: `${entry.staff_name} already scheduled ${entry.start_time}-${entry.end_time}`,
      })
    }
  }

  return conflicts
}

function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && startB < endA
}
