import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import type { FormSchema } from '@/types/forms'

const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

const SYSTEM_PROMPT = `You are a form-filling assistant for home care providers. Given a description of a client visit or shift, you fill in form fields with appropriate values.

Rules:
- Return ONLY a JSON object with field IDs as keys and their values
- For yes/no fields use true/false
- For select/radio fields use the exact option label
- For text/textarea fields provide concise, professional narrative
- For date fields use YYYY-MM-DD format
- For number fields use numbers
- For contact fields return { name, phone, email } or partial
- If you can't determine a value, use null (don't guess)
- Never include explanations or markdown`

export async function POST(req: Request) {
  const body = await req.json()
  const { schema, description } = body as { schema: FormSchema; description: string }

  if (!schema || !description) {
    return Response.json({ error: 'Missing schema or description' }, { status: 400 })
  }

  const fieldDescriptions = schema.sections.flatMap((section) =>
    section.fields.map((field) =>
      `${field.id}: ${field.label} (${field.type})${field.options ? ` options: ${field.options.join(', ')}` : ''}${field.required ? ' [required]' : ''}`
    )
  ).join('\n')

  const prompt = `Form: ${schema.title}
Fields:
${fieldDescriptions}

User description:
${description}

Fill the form fields based on this description. Return JSON only.`

  const { text } = await generateText({
    model: deepseek.chat('deepseek-chat'),
    system: SYSTEM_PROMPT,
    prompt,
    temperature: 0.3,
  })

  try {
    const cleaned = text.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim()
    const values = JSON.parse(cleaned)
    return Response.json({ values })
  } catch {
    return Response.json({ error: 'Failed to parse AI response', raw: text }, { status: 500 })
  }
}
