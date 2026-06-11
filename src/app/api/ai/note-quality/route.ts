import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { getSession } from '@/lib/auth/get-session'
import {
  buildNoteQualityPrompt,
  parseNoteQualityResponse,
  NOTE_QUALITY_SYSTEM_PROMPT,
} from '@/lib/ai/note-quality'

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

const MIN_NOTE_LENGTH = 20

export async function POST(req: Request) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user) {
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

  try {
    const { text } = await generateText({
      model: deepseek.chat('deepseek-chat'),
      system: NOTE_QUALITY_SYSTEM_PROMPT,
      prompt: buildNoteQualityPrompt({ noteText, serviceType: body?.serviceType ?? null }),
      temperature: 0.2,
    })
    const result = parseNoteQualityResponse(text)
    if (!result) {
      return Response.json({ error: 'Could not score this note. Try again.' }, { status: 502 })
    }
    return Response.json(result)
  } catch (error: unknown) {
    console.error('note-quality scoring failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: 'AI scoring is temporarily unavailable.' }, { status: 503 })
  }
}
