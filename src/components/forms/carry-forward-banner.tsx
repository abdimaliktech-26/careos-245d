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
    <div className="rounded-2xl border border-[#E8799E]/20 bg-[#EEF2FF] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8799E]/10">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E8799E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-[#3A2A4A]">
            Previous answers found
          </p>
          <p className="mt-0.5 text-[12px] text-[#64748B]">
            We found {suggestionCount} answer{suggestionCount === 1 ? '' : 's'} from the last completed{' '}
            <span className="font-semibold text-[#3A2A4A]">{templateName}</span> review.{' '}
            Would you like to carry answers forward?
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => { onApplyAll(); setDismissed(true) }}
              className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
            >
              Apply All ({suggestionCount})
            </button>
            <button
              type="button"
              onClick={() => { onReviewIndividual(); setDismissed(true) }}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Review Individual
            </button>
            <button
              type="button"
              onClick={() => { onDismiss(); setDismissed(true) }}
              className="rounded-lg px-3 py-2 text-[12px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
