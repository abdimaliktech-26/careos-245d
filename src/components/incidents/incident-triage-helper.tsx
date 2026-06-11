'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import type { IncidentClassifyResult } from '@/lib/ai/incident-classify'

/**
 * Reads the surrounding (uncontrolled, server-action) incident form's
 * description/category fields from the DOM on demand — decision support
 * only; never writes back into the form.
 */
export function IncidentTriageHelper() {
  const [result, setResult] = useState<IncidentClassifyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function triage() {
    const description =
      document.querySelector<HTMLTextAreaElement>('textarea[name="description"]')?.value ?? ''
    const category =
      document.querySelector<HTMLSelectElement>('select[name="category"]')?.value ?? ''
    if (description.trim().length < 20) {
      setError('Write at least a couple sentences in the description first.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/incident-classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, category: category || undefined }),
      })
      const data = (await res.json().catch(() => null)) as
        | (IncidentClassifyResult & { error?: string })
        | null
      if (!res.ok || !data?.severity) {
        setError(data?.error ?? 'Could not classify.')
        return
      }
      setResult(data)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const severityClass =
    result?.severity === 'serious'
      ? 'bg-status-error-bg text-status-error'
      : result?.severity === 'moderate'
        ? 'bg-status-warn-bg text-status-warn'
        : 'bg-status-ok-bg text-status-ok'

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">AI triage suggestion</span>
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-bold uppercase text-accent-foreground">AI</span>
        </div>
        <button
          type="button"
          onClick={triage}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${loading ? 'animate-spin' : ''}`} />
          {result ? 'Re-analyze' : 'Analyze description'}
        </button>
      </div>
      {error && <p className="mt-2 text-[11px] text-status-error">{error}</p>}
      {result && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] text-foreground">
            Suggested severity:{' '}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${severityClass}`}>
              {result.severity}
            </span>
            {result.mandatoryReporting && (
              <span className="ml-2 rounded-full bg-status-error-bg px-2 py-0.5 text-[10px] font-bold text-status-error">
                May require mandatory reporting
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">{result.rationale}</p>
          {result.deadlineNote && (
            <p className="text-[11px] font-semibold text-status-warn">{result.deadlineNote}</p>
          )}
          <p className="text-[10px] text-muted-foreground/70">
            Decision support only — staff judgment and agency policy determine final severity and reporting.
          </p>
        </div>
      )}
    </div>
  )
}
