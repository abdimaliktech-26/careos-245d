export interface MorningBriefingInput {
  userName: string
  activeClients: number
  overduePackets: number
  openIncidents: number
  trainingAlerts: number
  upcomingPackets: Array<{
    packet_type: string | null
    due_date: string | null
    client_name: string | null
  }>
}

export const MORNING_BRIEFING_SYSTEM_PROMPT = `You are a care operations assistant for a Minnesota 245D provider. Write a 2-4 sentence morning briefing for a staff member opening their dashboard.

Rules:
- Plain professional English, no markdown, no greeting fluff beyond one short opener
- Prioritize: overdue items first, then incidents, then upcoming deadlines
- Mention concrete client names and dates from the data
- Never invent facts; if everything is calm, say so in one sentence`

export function buildMorningBriefingPrompt(input: MorningBriefingInput): string {
  const deadlines = input.upcomingPackets.length
    ? input.upcomingPackets
        .map((p) =>
          `- ${String(p.packet_type ?? 'packet').replaceAll('_', ' ')} for ${p.client_name ?? 'unknown client'}, due ${p.due_date ?? 'unscheduled'}`
        )
        .join('\n')
    : 'No deadlines in the next 7 days.'

  return [
    `Staff member: ${input.userName}`,
    `Active clients: ${input.activeClients}`,
    `Overdue packets: ${input.overduePackets}`,
    `Open incidents: ${input.openIncidents}`,
    `Training alerts: ${input.trainingAlerts}`,
    '',
    'Deadlines next 7 days:',
    deadlines,
  ].join('\n')
}
