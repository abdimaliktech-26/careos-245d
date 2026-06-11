'use client'

import { useState } from 'react'

function ThumbUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/>
    </svg>
  )
}

function ThumbDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/>
    </svg>
  )
}

export function ArticleFeedback() {
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  if (feedback) {
    return (
      <div className="mt-8 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          {feedback === 'up' ? 'Glad this helped!' : 'Thanks for your feedback.'}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <div className="flex items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">Was this helpful?</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFeedback('up')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-primary hover:border-brand-to/40 transition-colors"
          >
            <ThumbUpIcon />
            Yes
          </button>
          <button
            type="button"
            onClick={() => setFeedback('down')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            <ThumbDownIcon />
            No
          </button>
        </div>
      </div>
    </div>
  )
}
