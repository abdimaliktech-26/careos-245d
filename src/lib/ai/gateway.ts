import { generateText, type LanguageModel } from 'ai'
import { createAdminClient } from '@/lib/supabase/admin'
import { getModel, getPrimaryProvider, getFallbackProvider, getModelName, isAiConfigured, type AiProvider } from './provider'
import { getOrgAiSettings, isFeatureEnabled } from './settings'
import { currentPeriod, isOverLimit } from './usage'

export type AiOk = { ok: true; text: string; provider: string; model: string; isDraft: true }
export type AiFail = { ok: false; reason: 'not_configured' | 'ai_disabled' | 'limit_reached' | 'ai_error'; message: string }
export type AiResult = AiOk | AiFail

type AiInput = { organizationId: string; userId: string | null; feature: string; system: string; prompt: string }

async function audit(input: AiInput, provider: AiProvider, status: string, usage?: { input?: number; output?: number }) {
  const admin = createAdminClient()
  await admin.from('ai_audit_logs').insert({
    organization_id: input.organizationId, user_id: input.userId, feature: input.feature,
    provider: provider === 'none' ? null : provider, model: provider === 'none' ? null : getModelName(provider),
    status, input_tokens: usage?.input ?? null, output_tokens: usage?.output ?? null,
  }).then(() => null, () => null)
}

async function tryModel(model: LanguageModel, system: string, prompt: string) {
  const r = await generateText({ model, system, prompt })
  return { text: r.text, input: r.usage?.inputTokens, output: r.usage?.outputTokens }
}

/** Governed AI text generation. Never throws — always returns an AiResult. */
export async function runAiText(input: AiInput): Promise<AiResult> {
  if (!isAiConfigured()) { await audit(input, 'none', 'not_configured'); return { ok: false, reason: 'not_configured', message: 'AI is not configured.' } }

  const settings = await getOrgAiSettings(input.organizationId)
  if (!isFeatureEnabled(settings, input.feature)) { await audit(input, 'none', 'disabled'); return { ok: false, reason: 'ai_disabled', message: 'AI is disabled for this organization.' } }

  const admin = createAdminClient()
  const period = currentPeriod()
  const { data: counter } = await admin.from('ai_usage_counters').select('count').eq('organization_id', input.organizationId).eq('period', period).maybeSingle()
  if (isOverLimit(counter?.count ?? 0, settings.monthlyLimit)) { await audit(input, 'none', 'limit_reached'); return { ok: false, reason: 'limit_reached', message: 'Monthly AI usage limit reached.' } }

  const primary = getPrimaryProvider()
  const fallback = getFallbackProvider()
  for (const provider of [primary, fallback]) {
    if (provider === 'none') continue
    const model = getModel(provider)
    if (!model) continue
    try {
      const out = await tryModel(model, input.system, input.prompt)
      await admin.rpc('increment_ai_usage', { p_org: input.organizationId, p_period: period }).then(() => null, () => null)
      await audit(input, provider, 'ok', { input: out.input, output: out.output })
      return { ok: true, text: out.text, provider, model: getModelName(provider), isDraft: true }
    } catch {
      // fall through to the fallback provider
    }
  }
  await audit(input, primary, 'error')
  return { ok: false, reason: 'ai_error', message: 'AI request failed.' }
}

/** Same governance as runAiText, parsing the model's JSON text with a validator. */
export async function runAiObject<T>(
  input: AiInput,
  parse: (text: string) => T,
): Promise<{ ok: true; data: T; isDraft: true } | AiFail> {
  const res = await runAiText(input)
  if (!res.ok) return res
  try { return { ok: true, data: parse(res.text), isDraft: true } } catch { return { ok: false, reason: 'ai_error', message: 'AI returned unparseable output.' } }
}
