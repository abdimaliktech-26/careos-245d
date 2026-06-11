export interface ClientSummaryInput {
  clientName: string
  program: string | null
  status: string | null
  packets: Array<{ packet_type: string | null; status: string | null; due_date: string | null }>
  incidents: Array<{ category: string | null; status: string | null; occurred_at: string | null }>
  goals: Array<{ title: string | null; status: string | null }>
}

export const CLIENT_SUMMARY_SYSTEM_PROMPT = `You are a clinical care coordinator assistant for a Minnesota 245D home and community-based services provider. Given structured data about a client, write a single concise paragraph (3-5 sentences) summarizing their current situation for a staff member opening the client's profile.

Rules:
- Plain professional English, no markdown
- Lead with overall standing, then call out anything needing attention (overdue packets, open incidents, stalled goals)
- Mention concrete dates when relevant
- Never invent facts not present in the data
- If everything is on track, say so plainly`

function formatPacketType(type: string | null): string {
  return String(type ?? 'unknown').replaceAll('_', ' ')
}

export function buildClientSummaryPrompt(input: ClientSummaryInput): string {
  const packetLines = input.packets.length
    ? input.packets
        .map((p) => `- ${formatPacketType(p.packet_type)}: ${p.status ?? 'unknown'}${p.due_date ? `, due ${p.due_date}` : ''}`)
        .join('\n')
    : 'No open packets.'

  const incidentLines = input.incidents.length
    ? input.incidents
        .map((i) => `- ${i.category ?? 'uncategorized'} (${i.status ?? 'unknown'})${i.occurred_at ? `, occurred ${i.occurred_at}` : ''}`)
        .join('\n')
    : 'No recent incidents.'

  const goalLines = input.goals.length
    ? input.goals.map((g) => `- ${g.title ?? 'untitled'} (${g.status ?? 'unknown'})`).join('\n')
    : 'No documented goals.'

  return [
    `Client: ${input.clientName}`,
    `Program: ${input.program ?? 'unspecified'}`,
    `Status: ${input.status ?? 'unknown'}`,
    '',
    'Open packets:',
    packetLines,
    '',
    'Recent incidents:',
    incidentLines,
    '',
    'Goals:',
    goalLines,
  ].join('\n')
}
