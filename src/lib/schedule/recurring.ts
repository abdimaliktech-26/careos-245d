import { addDays, format, parseISO } from 'date-fns'

export type RecurrencePattern = 'none' | 'daily' | 'weekdays' | 'mon_wed_fri' | 'tue_thu' | 'weekly'

export function expandRecurrence(
  startDate: string,
  pattern: RecurrencePattern,
  occurrences: number
): string[] {
  if (pattern === 'none') return [startDate]

  const dates: string[] = []
  const start = parseISO(startDate)
  let count = 0

  for (let i = 0; count < occurrences && i < occurrences * 14; i++) {
    const date = addDays(start, i)
    const day = date.getDay()

    let matches = false
    switch (pattern) {
      case 'daily':
        matches = true
        break
      case 'weekdays':
        matches = day >= 1 && day <= 5
        break
      case 'mon_wed_fri':
        matches = day === 1 || day === 3 || day === 5
        break
      case 'tue_thu':
        matches = day === 2 || day === 4
        break
      case 'weekly':
        matches = day === start.getDay()
        break
    }

    if (matches) {
      dates.push(format(date, 'yyyy-MM-dd'))
      count++
    }
  }

  return dates
}
