'use client'

import { useActionState, useState, useCallback } from 'react'
import { createSigningLink } from '@/lib/signing-links/actions'

export function SigningLinkForm({ packetFormId, defaultName, defaultEmail }: { packetFormId: string; defaultName?: string | null; defaultEmail?: string | null }) {
  const [state, action, isPending] = useActionState(
    createSigningLink as (s: { error: string | null; success: string | null | undefined; link: string | null | undefined }, p: FormData) => Promise<{ error: string | null; success: string | null | undefined; link: string | null | undefined }>,
    { error: null, success: null, link: null }
  )
  const [copied, setCopied] = useState(false)

  const copyLink = useCallback(async () => {
    if (!state.link) return
    try {
      const base = window.location.origin
      await navigator.clipboard.writeText(`${base}${state.link}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the text manually
    }
  }, [state.link])

  return (
    <form action={action} className="mt-3 space-y-2 rounded-xl border border-[#eadfd6] bg-[#fffaf6] p-3">
      <input type="hidden" name="packetFormId" value={packetFormId} />

      {state.error && <p className="text-xs font-semibold text-red-700">{state.error}</p>}

      {state.link && (
        <div className="space-y-2 rounded-lg bg-green-50 p-3">
          <p className="break-all text-xs font-semibold text-green-800" id="signing-link-url">
            {typeof window !== 'undefined' ? window.location.origin : ''}{state.link}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="rounded-md bg-green-700 px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-green-800"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              type="button"
              disabled
              title="Email sending not yet available"
              className="rounded-md border border-[#eadfd6] bg-card px-3 py-1.5 text-[11px] font-bold text-[#667085] disabled:opacity-50"
            >
              Resend
            </button>
          </div>
        </div>
      )}

      {state.success && !state.link && (
        <p className="rounded-lg bg-green-50 p-2 text-xs font-semibold text-green-800">{state.success}</p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <select name="signerRole" className="rounded-lg border border-[#eadfd6] bg-card px-2 py-2 text-xs">
          <option value="guardian">Guardian</option>
          <option value="client">Client</option>
        </select>
        <input
          name="signerName"
          defaultValue={defaultName ?? ''}
          required
          className="rounded-lg border border-[#eadfd6] bg-card px-2 py-2 text-xs"
          placeholder="Signer name"
        />
        <input
          name="signerEmail"
          defaultValue={defaultEmail ?? ''}
          className="rounded-lg border border-[#eadfd6] bg-card px-2 py-2 text-xs"
          placeholder="email optional"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          name="sendEmail"
          value="true"
          className="h-3.5 w-3.5 rounded border-[#eadfd6] text-[#f37d6d] focus:ring-[#f37d6d]"
        />
        <span className="text-[11px] text-[#667085]">Send email notification</span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-[#24343a] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1a282e] disabled:opacity-50"
      >
        {isPending ? 'Creating...' : 'Create Signing Link'}
      </button>
    </form>
  )
}
