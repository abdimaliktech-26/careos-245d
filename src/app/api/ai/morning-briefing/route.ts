import { generateText } from 'ai'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { aiModel } from '@/lib/ai/provider'
import {
  buildMorningBriefingPrompt,
  MORNING_BRIEFING_SYSTEM_PROMPT,
} from '@/lib/ai/morning-briefing'

const UPCOMING_WINDOW_DAYS = 7

export async function POST() {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const organizationId = user.organizationId
  const now = new Date()
  const windowEnd = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const todayIso = now.toISOString().slice(0, 10)
  const windowEndIso = windowEnd.toISOString().slice(0, 10)

  const [
    { count: activeClients },
    { count: overduePackets },
    { count: openIncidents },
    { count: trainingAlerts },
    { data: upcoming },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'active'),
    supabase.from('packets').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'overdue'),
    supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'closed'),
    supabase.from('staff_trainings').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).in('status', ['expired', 'expiring_soon', 'not_completed']),
    supabase
      .from('packets')
      .select('packet_type, due_date, clients(legal_name)')
      .eq('organization_id', organizationId)
      .neq('status', 'completed')
      .gte('due_date', todayIso)
      .lte('due_date', windowEndIso)
      .order('due_date', { ascending: true })
      .limit(6),
  ])

  const prompt = buildMorningBriefingPrompt({
    userName: user.fullName.split(' ')[0],
    activeClients: activeClients ?? 0,
    overduePackets: overduePackets ?? 0,
    openIncidents: openIncidents ?? 0,
    trainingAlerts: trainingAlerts ?? 0,
    upcomingPackets: ((upcoming ?? []) as Array<Record<string, unknown>>).map((p) => {
      const client = p.clients as { legal_name: string } | null
      return {
        packet_type: (p.packet_type as string | null) ?? null,
        due_date: (p.due_date as string | null) ?? null,
        client_name: client?.legal_name ?? null,
      }
    }),
  })

  try {
    const { text } = await generateText({
      model: aiModel,
      system: MORNING_BRIEFING_SYSTEM_PROMPT,
      prompt,
      temperature: 0.3,
    })
    return Response.json({ briefing: text.trim() })
  } catch (error: unknown) {
    console.error('morning-briefing generation failed', {
      organizationId,
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(
      { error: 'AI briefing is temporarily unavailable.' },
      { status: 503 }
    )
  }
}
