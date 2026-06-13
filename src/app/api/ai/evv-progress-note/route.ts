import { generateText } from 'ai'
import { z } from 'zod'
import { getSession } from '@/lib/auth/get-session'
import { aiModel } from '@/lib/ai/provider'
import { createClient } from '@/lib/supabase/server'
import {
  EVV_PROGRESS_NOTE_SYSTEM_PROMPT,
  buildProgressNotePrompt,
} from '@/lib/ai/evv-progress-note'

const requestSchema = z.object({
  visitId: z.string().uuid(),
  voiceTranscript: z.string().max(8000).optional(),
})

export async function POST(req: Request) {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: visit, error: visitError } = await supabase
    .from('evv_visits')
    .select(
      'id, service_name, service_date, actual_start, actual_end, notes, clients(legal_name), staff_profiles(full_name)'
    )
    .eq('id', parsed.data.visitId)
    .eq('organization_id', user.organizationId)
    .single()

  if (visitError || !visit) {
    return Response.json({ error: 'Visit not found.' }, { status: 404 })
  }

  const client = visit.clients as unknown as { legal_name: string } | null
  const staff = visit.staff_profiles as unknown as { full_name: string } | null

  try {
    const { text } = await generateText({
      model: aiModel,
      system: EVV_PROGRESS_NOTE_SYSTEM_PROMPT,
      prompt: buildProgressNotePrompt({
        clientName: client?.legal_name ?? 'the client',
        serviceName: visit.service_name,
        serviceDate: visit.service_date,
        actualStart: visit.actual_start,
        actualEnd: visit.actual_end,
        staffName: staff?.full_name ?? null,
        visitNotes: visit.notes,
        voiceTranscript: parsed.data.voiceTranscript ?? null,
      }),
      temperature: 0.3,
    })

    const note = text.trim()
    if (note.length < 20) {
      return Response.json({ error: 'Could not draft a note. Try again.' }, { status: 502 })
    }
    return Response.json({ note })
  } catch (error: unknown) {
    console.error('evv progress note drafting failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ error: 'AI drafting is temporarily unavailable.' }, { status: 503 })
  }
}
