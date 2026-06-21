import { getSession } from '@/lib/auth/get-session'
import { runAiText } from '@/lib/ai/gateway'
import {
  buildIncidentClassifyPrompt,
  parseIncidentClassifyResponse,
  INCIDENT_CLASSIFY_SYSTEM_PROMPT,
} from '@/lib/ai/incident-classify'

const MIN_DESCRIPTION_LENGTH = 20

export async function POST(req: Request) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
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

  const ai = await runAiText({
    organizationId: user.organizationId, userId: user.id, feature: 'incident_classify',
    system: INCIDENT_CLASSIFY_SYSTEM_PROMPT,
    prompt: buildIncidentClassifyPrompt({ description, category: body?.category ?? null }),
  })
  if (!ai.ok) {
    return Response.json({ error: ai.message, reason: ai.reason }, { status: ai.reason === 'ai_error' ? 502 : 409 })
  }
  const result = parseIncidentClassifyResponse(ai.text)
  if (!result) {
    return Response.json({ error: 'Could not classify. Try again.' }, { status: 502 })
  }
  return Response.json({ ...result, isDraft: true })
}
