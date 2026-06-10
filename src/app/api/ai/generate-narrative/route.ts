import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

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

  const { text } = await generateText({
    model: deepseek.chat('deepseek-chat'),
    system: SYSTEM_PROMPT,
    prompt,
    temperature: 0.4,
  })

  return Response.json({ narrative: text.trim() })
}
