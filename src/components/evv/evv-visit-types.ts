/** Serializable visit row passed from the EVV page (server) to client components. */
export type EvvTableVisit = {
  id: string
  serviceDate: string
  clientName: string
  staffName: string
  serviceName: string | null
  scheduledStart: string | null
  scheduledEnd: string | null
  actualStart: string | null
  actualEnd: string | null
  status: string
  stageIndex: number
  stageLabel: string
  curesComplete: boolean
  exceptionCount: number
  billableMinutes: number
  progressNote: string | null
  progressNoteSource: string | null
  reviewStatus: string | null
  billingStatus: string | null
  linkedScheduleId: string | null
}
