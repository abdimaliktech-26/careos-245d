import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { runAiText } from '@/lib/ai/gateway'

export async function POST(req: NextRequest) {
  try {
    const { user, error: sessionError } = await getSession()
    if (sessionError || !user || !user.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const ai = await runAiText({
      organizationId: user.organizationId, userId: user.id, feature: 'optimize_schedule',
      system: 'You are a scheduling optimization assistant. Respond with valid JSON only.',
      prompt,
    })
    if (!ai.ok) {
      return NextResponse.json({ error: ai.message, reason: ai.reason }, { status: ai.reason === 'ai_error' ? 502 : 409 })
    }

    const data = JSON.parse(ai.text)
    return NextResponse.json({ ...data, isDraft: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
