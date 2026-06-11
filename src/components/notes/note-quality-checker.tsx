'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import type { NoteQualityResult } from '@/lib/ai/note-quality'

interface NoteQualityCheckerProps {
  noteText: string
  serviceType?: string | null
}

export function NoteQualityChecker({ noteText, serviceType }: NoteQualityCheckerProps) {
  const [result, setResult] = useState<NoteQualityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function check() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai/note-quality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText, serviceType: serviceType ?? undefined }),
      })
      const data = (await res.json().catch(() => null)) as
        | (NoteQualityResult & { error?: string })
        | null
      if (!res.ok || typeof data?.score !== 'number') {
        setError(data?.error ?? 'Could not score note.')
        return
      }
      setResult(data)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const scoreClass =
    result == null
      ? ''
      : result.score >= 80
        ? 'bg-status-ok-bg text-status-ok'
        : result.score >= 60
          ? 'bg-status-warn-bg text-status-warn'
          : 'bg-status-error-bg text-status-error'

  return (
    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Billing-readiness check</span>
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[8px] font-bold uppercase text-accent-foreground">AI</span>
          {result && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${scoreClass}`}>
              {result.score}/100
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={check}
          disabled={loading || noteText.trim().length < 20}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${loading ? 'animate-spin' : ''}`} />
          {result ? 'Re-check' : 'Check note'}
        </button>
      </div>
      {error && <p className="mt-2 text-[11px] text-status-error">{error}</p>}
      {result && (
        <div className="mt-2 space-y-1">
          {result.issues.map((issue) => (
            <p key={issue} className="text-[11px] text-status-warn">▲ {issue}</p>
          ))}
          {result.strengths.map((strength) => (
            <p key={strength} className="text-[11px] text-status-ok">✓ {strength}</p>
          ))}
        </div>
      )}
    </div>
  )
}
