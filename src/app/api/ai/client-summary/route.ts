import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import {
  buildClientSummaryPrompt,
  CLIENT_SUMMARY_SYSTEM_PROMPT,
} from '@/lib/ai/client-summary'

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

export async function POST(req: Request) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as { clientId?: string } | null
  const clientId = body?.clientId
  if (!clientId || typeof clientId !== 'string') {
    return Response.json({ error: 'clientId is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, legal_name, program, status')
    .eq('id', clientId)
    .eq('organization_id', user.organizationId)
    .single()

  if (!client) {
    return Response.json({ error: 'Client not found' }, { status: 404 })
  }

  const [{ data: packets }, { data: incidents }, { data: goals }] = await Promise.all([
    supabase
      .from('packets')
      .select('packet_type, status, due_date')
      .eq('client_id', clientId)
      .neq('status', 'completed')
      .order('due_date', { ascending: true })
      .limit(10),
    supabase
      .from('incidents')
      .select('category, status, occurred_at')
      .eq('client_id', clientId)
      .order('occurred_at', { ascending: false })
      .limit(5),
    supabase
      .from('goals')
      .select('title, status')
      .eq('client_id', clientId)
      .limit(10),
  ])

  const prompt = buildClientSummaryPrompt({
    clientName: client.legal_name,
    program: client.program,
    status: client.status,
    packets: packets ?? [],
    incidents: incidents ?? [],
    goals: goals ?? [],
  })

  try {
    const { text } = await generateText({
      model: deepseek.chat('deepseek-chat'),
      system: CLIENT_SUMMARY_SYSTEM_PROMPT,
      prompt,
      temperature: 0.3,
    })
    return Response.json({ summary: text.trim() })
  } catch (error: unknown) {
    console.error('client-summary generation failed', {
      clientId,
      organizationId: user.organizationId,
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json(
      { error: 'AI summary is temporarily unavailable. Try again later.' },
      { status: 503 }
    )
  }
}
