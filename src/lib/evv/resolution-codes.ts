/** Reason codes a supervisor can attach when resolving an EVV exception. */
export const RESOLUTION_CODES = [
  { code: 'client_request', label: 'Client requested change' },
  { code: 'staff_emergency', label: 'Staff emergency' },
  { code: 'device_issue', label: 'Device / GPS issue' },
  { code: 'schedule_change', label: 'Authorized schedule change' },
  { code: 'documentation_corrected', label: 'Documentation corrected' },
  { code: 'other', label: 'Other (explain in note)' },
] as const

export type ResolutionCode = (typeof RESOLUTION_CODES)[number]['code']
