import { generateText } from 'ai'
import { getSession } from '@/lib/auth/get-session'
import { aiModel } from '@/lib/ai/provider'
import {
  buildIncidentClassifyPrompt,
  parseIncidentClassifyResponse,
  INCIDENT_CLASSIFY_SYSTEM_PROMPT,
} from '@/lib/ai/incident-classify'

const MIN_DESCRIPTION_LENGTH = 20

export async function POST(req: Request) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as
    | { description?: string; category?: string }
    | null
  const description = body?.description?.trim()
  if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
    return Response.json(
      { error: `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters.` },
      { status: 400 }
    )
  }

  try {
    const { text } = await generateText({
      model: aiModel,
      system: INCIDENT_CLASSIFY_SYSTEM_PROMPT,
      prompt: buildIncidentClassifyPrompt({ description, category: body?.category ?? null }),
      temperature: 0.1,
    })
    const result = parseIncidentClassifyResponse(text)
    if (!result) {
      return Response.json({ error: 'Could not classify. Try again.' }, { status: 502 })
    }
    return Response.json(result)
  } catch (error: unknown) {
    console.error('incident-classify failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: 'AI triage is temporarily unavailable.' }, { status: 503 })
  }
}
