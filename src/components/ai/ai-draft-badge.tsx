/** Label shown wherever AI output is rendered. AI output is advisory, not final. */
export function AiDraftBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
      AI draft · recommendation — not a final determination
    </span>
  )
}
