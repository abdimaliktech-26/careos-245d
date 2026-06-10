'use client'

export function MessageForm({
  action,
  placeholder = 'Type your message…',
  submitLabel = 'Send',
}: {
  action: (formData: FormData) => Promise<void>
  placeholder?: string
  submitLabel?: string
}) {
  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1">
        <textarea
          name="message"
          required
          rows={2}
          placeholder={placeholder}
          className="care-input w-full rounded-xl border px-3 py-2.5 text-sm resize-none"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-[#E8799E] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity flex items-center gap-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
        {submitLabel}
      </button>
    </form>
  )
}
