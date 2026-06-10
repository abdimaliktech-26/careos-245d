const DAY_MS = 24 * 60 * 60 * 1000

export type PacketComplianceLevel = 'complete' | 'overdue' | 'due_today' | 'due_tomorrow' | 'warning' | 'none'

export type PacketCompliance = {
  daysUntilDue: number | null
  level: PacketComplianceLevel
  label: string
  isAlert: boolean
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getPacketCompliance(
  dueDate: string | null | undefined,
  status: string | null | undefined,
  now = new Date()
): PacketCompliance {
  if (status === 'completed') {
    return { daysUntilDue: null, level: 'complete', label: 'Completed', isAlert: false }
  }

  if (!dueDate) {
    return { daysUntilDue: null, level: 'none', label: 'No due date', isAlert: false }
  }

  const due = startOfLocalDay(new Date(`${dueDate}T00:00:00`))
  const today = startOfLocalDay(now)
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / DAY_MS)

  if (daysUntilDue < 0) {
    const daysOverdue = Math.abs(daysUntilDue)
    return {
      daysUntilDue,
      level: 'overdue',
      label: `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`,
      isAlert: true,
    }
  }

  if (daysUntilDue === 0) {
    return { daysUntilDue, level: 'due_today', label: 'Due today', isAlert: true }
  }

  if (daysUntilDue === 1) {
    return { daysUntilDue, level: 'due_tomorrow', label: 'Due tomorrow', isAlert: true }
  }

  if (daysUntilDue <= 14) {
    return { daysUntilDue, level: 'warning', label: `Due in ${daysUntilDue} days`, isAlert: true }
  }

  return { daysUntilDue, level: 'none', label: `Due in ${daysUntilDue} days`, isAlert: false }
}

export function complianceBadgeClass(level: PacketComplianceLevel) {
  switch (level) {
    case 'overdue':
      return 'bg-red-100 text-red-700'
    case 'due_today':
    case 'due_tomorrow':
      return 'bg-orange-100 text-orange-700'
    case 'warning':
      return 'bg-amber-100 text-amber-700'
    case 'complete':
      return 'bg-green-100 text-green-700'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}
