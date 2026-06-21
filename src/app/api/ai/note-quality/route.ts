import { getSession } from '@/lib/auth/get-session'
import { runAiText } from '@/lib/ai/gateway'
import {
  buildNoteQualityPrompt,
  parseNoteQualityResponse,
  NOTE_QUALITY_SYSTEM_PROMPT,
} from '@/lib/ai/note-quality'

const MIN_NOTE_LENGTH = 20

export async function POST(req: Request) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as
    | { noteText?: string; serviceType?: string }
    | null
  const noteText = body?.noteText?.trim()
  if (!noteText || noteText.length < MIN_NOTE_LENGTH) {
    return Response.json(
      { error: `Note must be at least ${MIN_NOTE_LENGTH} characters.` },
      { status: 400 }
    )
  }

  const ai = await runAiText({
    organizationId: user.organizationId, userId: user.id, feature: 'note_quality',
    system: NOTE_QUALITY_SYSTEM_PROMPT,
    prompt: buildNoteQualityPrompt({ noteText, serviceType: body?.serviceType ?? null }),
  })
  if (!ai.ok) {
    return Response.json({ error: ai.message, reason: ai.reason }, { status: ai.reason === 'ai_error' ? 502 : 409 })
  }
  const result = parseNoteQualityResponse(ai.text)
  if (!result) {
    return Response.json({ error: 'Could not score this note. Try again.' }, { status: 502 })
  }
  return Response.json({ ...result, isDraft: true })
}
