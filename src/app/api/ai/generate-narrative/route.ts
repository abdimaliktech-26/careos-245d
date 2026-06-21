import { getSession } from '@/lib/auth/get-session'
import { runAiText } from '@/lib/ai/gateway'

const SYSTEM_PROMPT = `You are a clinical documentation specialist for home care. Given completed form field labels and values, generate a professional clinical narrative summary.

Rules:
- Write in clear, professional English
- Be concise but thorough
- Use clinical terminology naturally
- Include relevant observations, actions taken, and outcomes
- If information is missing note it briefly
- Output plain text only, no markdown
- Keep it to 3-5 sentences`

export async function POST(req: Request) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { formTitle, clientName, fields } = body as {
    formTitle: string
    clientName?: string
    fields: Array<{ label: string; value: string }>
  }

  if (!fields || fields.length === 0) {
    return Response.json({ error: 'No field data provided' }, { status: 400 })
  }

  const data = fields
    .filter((f) => f.value && String(f.value).trim())
    .map((f) => `${f.label}: ${f.value}`)
    .join('\n')

  const prompt = `Generate a clinical narrative summary for${clientName ? ` ${clientName}` : ' the client'} from this ${formTitle || 'completed form'}:\n\n${data}`

  const ai = await runAiText({
    organizationId: user.organizationId, userId: user.id, feature: 'generate_narrative',
    system: SYSTEM_PROMPT, prompt,
  })
  if (!ai.ok) {
    return Response.json({ error: ai.message, reason: ai.reason }, { status: ai.reason === 'ai_error' ? 502 : 409 })
  }
  return Response.json({ narrative: ai.text.trim(), isDraft: true })
}
