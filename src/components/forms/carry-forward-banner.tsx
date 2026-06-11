'use client'

import { useState } from 'react'

type CarryForwardBannerProps = {
  templateName: string
  suggestionCount: number
  onApplyAll: () => void
  onReviewIndividual: () => void
  onDismiss: () => void
}

export function CarryForwardBanner({
  templateName,
  suggestionCount,
  onApplyAll,
  onReviewIndividual,
  onDismiss,
}: CarryForwardBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || suggestionCount === 0) return null

  return (
    <div className="rounded-2xl border border-primary/20 bg-accent p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-foreground">
            Previous answers found
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            We found {suggestionCount} answer{suggestionCount === 1 ? '' : 's'} from the last completed{' '}
            <span className="font-semibold text-foreground">{templateName}</span> review.{' '}
            Would you like to carry answers forward?
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { onApplyAll(); setDismissed(true) }}
              className="rounded-lg bg-gradient-to-br from-brand-from to-brand-to px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              Apply All ({suggestionCount})
            </button>
            <button
              type="button"
              onClick={() => { onReviewIndividual(); setDismissed(true) }}
              className="rounded-lg border border-border bg-card px-3.5 py-2 text-[12px] font-semibold text-foreground hover:bg-muted/40 transition-colors"
            >
              Review Individual
            </button>
            <button
              type="button"
              onClick={() => { onDismiss(); setDismissed(true) }}
              className="rounded-lg px-3 py-2 text-[12px] font-semibold text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
