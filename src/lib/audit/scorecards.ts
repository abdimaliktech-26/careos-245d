import { createClient } from '@/lib/supabase/server'
import { getPacketCompliance } from '@/lib/packets/compliance'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'

export type ClientScorecard = {
  clientId: string
  clientName: string
  program: string
  status: string
  totalPackets: number
  completedPackets: number
  overduePackets: number
  inProgressPackets: number
  signatureIssues: number
  packetScore: number
  overallHealth: 'good' | 'attention' | 'critical'
}

export async function getClientScorecards(organizationId: string): Promise<ClientScorecard[]> {
  const supabase = await createClient()

  const { data: packets } = await supabase
    .from('packets')
    .select('id, client_id, packet_type, status, due_date, clients!inner(legal_name, program, status)')
    .eq('organization_id', organizationId)
    .order('due_date', { ascending: false })

  const packetRows = (packets ?? []) as Array<Record<string, unknown>>
  const clientMap = new Map<string, ClientScorecard>()

  for (const packet of packetRows) {
    const client = packet.clients as { legal_name: string; program: string; status: string }
    const clientId = packet.client_id as string

    if (!clientMap.has(clientId)) {
      clientMap.set(clientId, {
        clientId,
        clientName: client.legal_name,
        program: client.program,
        status: client.status,
        totalPackets: 0,
        completedPackets: 0,
        overduePackets: 0,
        inProgressPackets: 0,
        signatureIssues: 0,
        packetScore: 100,
        overallHealth: 'good',
      })
    }

    const card = clientMap.get(clientId)!
    card.totalPackets++

    const compliance = getPacketCompliance(packet.due_date as string | null, packet.status as string | null)
    if (packet.status === 'completed') card.completedPackets++
    else if (compliance.level === 'overdue') card.overduePackets++
    else if (packet.status === 'in_progress' || packet.status === 'needs_signature') card.inProgressPackets++
  }

  const result: ClientScorecard[] = []
  for (const card of clientMap.values()) {
    const penalty = (card.overduePackets * 15) + (card.inProgressPackets * 5) + (card.signatureIssues * 10)
    card.packetScore = Math.max(0, 100 - penalty)
    card.overallHealth = card.packetScore >= 80 ? 'good' : card.packetScore >= 50 ? 'attention' : 'critical'
    result.push(card)
  }

  return result.sort((a, b) => a.packetScore - b.packetScore)
}

export async function getClientScorecardDetail(clientId: string, organizationId: string): Promise<{
  card: ClientScorecard | null
  packets: Array<{ id: string; type: string; dueDate: string; status: string; compliance: string; formsComplete: number; formsTotal: number }>
}> {
  const supabase = await createClient()

  const [{ data: client }, { data: packets }] = await Promise.all([
    supabase.from('clients').select('id, legal_name, program, status').eq('id', clientId).eq('organization_id', organizationId).single(),
    supabase
      .from('packets')
      .select('id, packet_type, due_date, status, packet_forms(id, status)')
      .eq('client_id', clientId)
      .eq('organization_id', organizationId)
      .order('due_date', { ascending: true }),
  ])

  if (!client) return { card: null, packets: [] }

  const packetRows = (packets ?? []) as Array<Record<string, unknown>>
  let overdue = 0, inProgress = 0, completed = 0
  const sigIssues = 0

  const packetDetails = packetRows.map((p) => {
    const compliance = getPacketCompliance(p.due_date as string | null, p.status as string | null)
    const forms = (p.packet_forms ?? []) as Array<{ id: string; status: string }>
    const formsComplete = forms.filter((f) => f.status === 'completed').length

    if (p.status === 'completed') completed++
    else if (compliance.level === 'overdue') overdue++
    else if (p.status === 'in_progress' || p.status === 'needs_signature') inProgress++

    return {
      id: p.id as string,
      type: (p.packet_type as string).replaceAll('_', ' '),
      dueDate: p.due_date as string,
      status: p.status as string,
      compliance: compliance.level,
      formsComplete,
      formsTotal: forms.length,
    }
  })

  const penalty = (overdue * 15) + (inProgress * 5) + (sigIssues * 10)
  const score = Math.max(0, 100 - penalty)

  const card: ClientScorecard = {
    clientId: client.id,
    clientName: client.legal_name,
    program: client.program,
    status: client.status,
    totalPackets: packetRows.length,
    completedPackets: completed,
    overduePackets: overdue,
    inProgressPackets: inProgress,
    signatureIssues: sigIssues,
    packetScore: score,
    overallHealth: score >= 80 ? 'good' : score >= 50 ? 'attention' : 'critical',
  }

  return { card, packets: packetDetails }
}
