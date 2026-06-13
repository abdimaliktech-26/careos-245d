/**
 * Prompt construction for AI-drafted 245D progress notes.
 *
 * The model only DRAFTS — every note goes through human supervisor review
 * before it counts toward compliance or billing. Keep that boundary.
 */

export const EVV_PROGRESS_NOTE_SYSTEM_PROMPT = `You are a documentation assistant for a Minnesota 245D home and community-based services provider.
Write a professional, objective progress note for a single service visit.

Requirements:
- Use plain, factual language. Describe observable actions and client responses.
- Reference the service provided and how it relates to the client's support plan.
- Never invent clinical observations, measurements, behaviors, or outcomes that were not provided.
- If the provided details are thin, write a shorter note rather than fabricating content.
- Do not include any diagnosis or medical advice.
- 80-180 words, single paragraph, third person, past tense.
- Output ONLY the note text. No headers, no preamble, no quotation marks.`

export type ProgressNoteContext = {
  clientName: string
  serviceName: string | null
  serviceDate: string
  actualStart: string | null
  actualEnd: string | null
  staffName: string | null
  visitNotes: string | null
  voiceTranscript: string | null
}

function formatTime(timestamp: string | null): string {
  if (!timestamp) return 'not recorded'
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function buildProgressNotePrompt(context: ProgressNoteContext): string {
  const lines = [
    `Client: ${context.clientName}`,
    `Service: ${context.serviceName ?? 'Direct support service'}`,
    `Date: ${context.serviceDate}`,
    `Time: ${formatTime(context.actualStart)} to ${formatTime(context.actualEnd)}`,
    `Staff: ${context.staffName ?? 'Assigned staff'}`,
  ]
  if (context.visitNotes?.trim()) {
    lines.push('', 'Staff visit notes (primary source — base the note on this):', context.visitNotes.trim())
  }
  if (context.voiceTranscript?.trim()) {
    lines.push('', 'Voice dictation from staff (primary source — base the note on this):', context.voiceTranscript.trim())
  }
  if (!context.visitNotes?.trim() && !context.voiceTranscript?.trim()) {
    lines.push(
      '',
      'No staff narrative was provided. Write a brief, generic service-delivery note that states the service, date, and times, and explicitly notes that detailed observations were not documented by staff.'
    )
  }
  return lines.join('\n')
}
