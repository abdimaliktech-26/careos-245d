import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createOpenAI as createDeepSeek } from '@ai-sdk/openai'

const deepseek = createDeepSeek({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

export async function POST(req: NextRequest) {
  try {
    const { clients, staff, existingSchedules } = (await req.json()) as {
      clients: Array<{ id: string; name: string; needs: string }>
      staff: Array<{ id: string; name: string; availability: string; skills: string }>
      existingSchedules: Array<{ date: string; client: string; staff: string; start: string; end: string }>
    }

    const prompt = `You are a scheduling optimization assistant for an I/DD service provider.
Given the following data, suggest optimal schedule assignments that minimize conflicts, respect staff availability and skills, and meet client needs.

Clients:
${JSON.stringify(clients, null, 2)}

Staff:
${JSON.stringify(staff, null, 2)}

Existing schedules:
${JSON.stringify(existingSchedules, null, 2)}

Respond with a JSON object containing:
{
  "suggestions": [
    {
      "clientId": "client id",
      "clientName": "client name",
      "staffId": "staff id",
      "staffName": "staff name",
      "suggestedDates": ["YYYY-MM-DD"],
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "reasoning": "Brief explanation"
    }
  ],
  "summary": "High-level optimization summary"
}

Return ONLY valid JSON, no markdown formatting.`

    const { text } = await generateText({
      model: deepseek('deepseek-chat'),
      prompt,
      maxOutputTokens: 4096,
      temperature: 0.3,
    })

    const data = JSON.parse(text)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
