'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { useVoiceInput, type VoiceLang } from '@/hooks/use-voice-input'
import { VoiceMicButton } from '@/components/ui/voice-mic-button'
import { saveProgressNote, supervisorReview, billingDecision } from '@/lib/evv/workflow-actions'
import { EvvWorkflowStepper } from './evv-workflow-stepper'
import type { EvvTableVisit } from './evv-visit-types'

export function EvvVisitDetail({ visit, canSupervise }: { visit: EvvTableVisit; canSupervise: boolean }) {
  const router = useRouter()
  const [note, setNote] = useState(visit.progressNote ?? '')
  const [noteSource, setNoteSource] = useState<'manual' | 'voice' | 'ai'>('manual')
  const [reviewNote, setReviewNote] = useState('')
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('en')
  const [pending, setPending] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { isListening, isSupported, start, stop } = useVoiceInput({
    lang: voiceLang,
    onResult: (transcript, isFinal) => {
      if (!isFinal) return
      setNote((current) => (current ? `${current} ${transcript}` : transcript))
      setNoteSource('voice')
    },
    onError: (msg) => setError(msg),
  })

  async function run(label: string, task: () => Promise<{ error: string | null; success?: string | null }>) {
    setPending(label)
    setMessage(null)
    setError(null)
    const result = await task()
    setPending(null)
    if (result.error) setError(result.error)
    else {
      setMessage(result.success ?? 'Saved.')
      router.refresh()
    }
  }

  async function draftWithAi() {
    setPending('draft')
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/ai/evv-progress-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: visit.id, voiceTranscript: note || undefined }),
      })
      const data = (await res.json().catch(() => null)) as { note?: string; error?: string } | null
      if (!res.ok || !data?.note) {
        setError(data?.error ?? 'Could not draft a note.')
        return
      }
      setNote(data.note)
      setNoteSource('ai')
      setMessage('AI draft ready — review, edit, then save. A supervisor must approve before billing.')
    } catch {
      setError('Network error. Try again.')
    } finally {
      setPending(null)
    }
  }

  const canBill = visit.reviewStatus === 'approved' && visit.billingStatus !== 'approved'

  return (
    <div className="space-y-4 bg-muted/20 px-5 py-4">
      <EvvWorkflowStepper currentIndex={visit.stageIndex} />

      {/* Progress note */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">245D Progress Note</p>
          {visit.progressNoteSource === 'ai' && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase text-accent-foreground">
              AI-drafted · human-reviewed
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            {(['en', 'so'] as VoiceLang[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setVoiceLang(lang)}
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition ${
                  voiceLang === lang ? 'bg-accent text-primary' : 'text-muted-foreground'
                }`}
              >
                {lang === 'en' ? 'EN' : 'SO'}
              </button>
            ))}
            <VoiceMicButton
              isListening={isListening}
              isSupported={isSupported}
              lang={voiceLang}
              onClick={() => (isListening ? stop() : start())}
              size="sm"
            />
            <button
              type="button"
              onClick={draftWithAi}
              disabled={pending !== null}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[10px] font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              {pending === 'draft' ? 'Drafting…' : 'Draft with AI'}
            </button>
          </div>
        </div>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setNoteSource('manual')
          }}
          rows={4}
          placeholder="Dictate with the mic, draft with AI, or type the service note…"
          className="care-input w-full rounded-xl border px-3 py-2 text-sm leading-6"
        />
        <button
          type="button"
          disabled={pending !== null || note.trim().length < 20}
          onClick={() => run('note', () => saveProgressNote(visit.id, note, noteSource))}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {pending === 'note' ? 'Saving…' : 'Save note for supervisor review'}
        </button>
      </div>

      {/* Supervisor review + billing approval */}
      {canSupervise && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Supervisor Review</p>
            <span className="text-[11px] text-muted-foreground">
              Status: <strong className="text-foreground">{visit.reviewStatus ?? 'pending'}</strong>
              {' · '}Billing: <strong className="text-foreground">{visit.billingStatus ?? 'not_ready'}</strong>
            </span>
          </div>
          <input
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Review note (optional)"
            className="care-input w-full rounded-xl border px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending !== null || !visit.progressNote}
              onClick={() => run('review', () => supervisorReview(visit.id, 'approved', reviewNote))}
              className="rounded-lg bg-status-ok px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Approve visit
            </button>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => run('review', () => supervisorReview(visit.id, 'rejected', reviewNote))}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              Return to staff
            </button>
            <button
              type="button"
              disabled={pending !== null || !canBill}
              onClick={() => run('billing', () => billingDecision(visit.id, 'approved'))}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Approve for billing
            </button>
            <button
              type="button"
              disabled={pending !== null || visit.billingStatus === 'rejected'}
              onClick={() => run('billing', () => billingDecision(visit.id, 'rejected'))}
              className="rounded-lg border border-status-error/40 px-3 py-1.5 text-xs font-semibold text-status-error hover:bg-status-error-bg disabled:opacity-50"
            >
              Reject billing
            </button>
          </div>
          {!visit.progressNote && (
            <p className="text-[11px] text-muted-foreground">A progress note is required before approval.</p>
          )}
        </div>
      )}

      {message && <p className="text-xs text-status-ok">{message}</p>}
      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  )
}
