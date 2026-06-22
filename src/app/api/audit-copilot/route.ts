import { streamText, convertToModelMessages } from 'ai'
import { getSession } from '@/lib/auth/get-session'
import { getModel, getPrimaryProvider, isAiConfigured } from '@/lib/ai/provider'
import { getOrgAiSettings, isFeatureEnabled } from '@/lib/ai/settings'
import { buildCopilotContext } from '@/lib/audit-readiness/ai/copilot-context'

const SYSTEM_PROMPT = `You are Audit Copilot, an expert Minnesota 245D compliance auditor embedded in the CareOS Audit Readiness module.

You help providers prepare for licensing reviews, internal audits, accreditation reviews, and payer audits. Answer questions like:
- What documents are missing?
- Which clients are highest risk?
- Which staff trainings expire next month?
- What should I fix before a licensing review?
- Show all overdue reviews.

Rules:
- Answer ONLY from the ORGANIZATION AUDIT DATA provided below. If the data does not contain the answer, say so plainly rather than inventing details.
- Be concise and specific. Use names, counts, and dates from the data.
- When asked what to fix, prioritize high-risk items first.
- You are a compliance assistant only; do not provide legal advice.`

const AI_FEATURE = 'audit_readiness'

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return Response.json({ error: 'AI is not configured.' }, { status: 409 })
  }

  const { user } = await getSession()
  if (!user?.organizationId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getOrgAiSettings(user.organizationId)
  if (!isFeatureEnabled(settings, AI_FEATURE)) {
    return Response.json({ error: 'AI is disabled for this organization.' }, { status: 409 })
  }

  const model = getModel(getPrimaryProvider())
  if (!model) {
    return Response.json({ error: 'AI is not configured.' }, { status: 409 })
  }

  const context = await buildCopilotContext(user.organizationId)

  const body = await req.json()
  const uiMessages = Array.isArray(body) ? body : (body.messages ?? [])
  const messages = await convertToModelMessages(uiMessages)

  const result = streamText({
    model,
    system: `${SYSTEM_PROMPT}\n\n${context}`,
    messages,
    maxOutputTokens: 1024,
    temperature: 0.3,
  })

  return result.toUIMessageStreamResponse()
}
