'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { completeExternalSignature } from '@/lib/signing-links/actions'
import { SignaturePad } from './signature-pad'

type State = { error: string | null; success?: string | null; link?: string | null }

export function ExternalSignatureForm({ token, signerName }: { token: string; signerName: string }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(
    completeExternalSignature as (s: State, p: FormData) => Promise<State>,
    { error: null, success: null }
  )
  const [sigType, setSigType] = useState<'typed' | 'drawn'>('typed')
  const [sigDrawn, setSigDrawn] = useState<string | null>(null)
  const [terms, setTerms] = useState(false)
  const [done, setDone] = useState(false)
  const redirected = useRef(false)

  useEffect(() => {
    if (state.success && !redirected.current) {
      redirected.current = true
      setDone(true)
      const t = setTimeout(() => router.push(`/sign/${token}/success`), 2000)
      return () => clearTimeout(t)
    }
  }, [state.success, router, token])

  if (done) {
    return (
      <div className="care-panel animate-in fade-in zoom-in-95 rounded-2xl p-6 text-center duration-500 sm:p-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <span className="text-3xl text-green-600">✓</span>
        </div>
        <p className="text-lg font-black text-green-700">Signature Saved!</p>
        <p className="mt-2 text-sm text-[#667085]">Redirecting to confirmation&hellip;</p>
      </div>
    )
  }

  return (
    <form action={action} className="care-panel rounded-2xl p-4 sm:p-6">
      <div className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="signatureDrawn" value={sigDrawn ?? ''} />

        {state.error && (
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Signer Name</span>
          <input
            name="signerName"
            defaultValue={signerName}
            required
            minLength={2}
            className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
          />
        </label>

        <div>
          <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Signature Type</span>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => setSigType('typed')}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                sigType === 'typed'
                  ? 'border-[#f37d6d] bg-[#f37d6d]/10 text-[#8B4B2D]'
                  : 'border-[#eadfd6] text-[#667085] hover:border-[#d4c5b8]'
              }`}
            >
              Type Signature
            </button>
            <button
              type="button"
              onClick={() => setSigType('drawn')}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                sigType === 'drawn'
                  ? 'border-[#f37d6d] bg-[#f37d6d]/10 text-[#8B4B2D]'
                  : 'border-[#eadfd6] text-[#667085] hover:border-[#d4c5b8]'
              }`}
            >
              Draw Signature
            </button>
          </div>
        </div>

        {sigType === 'typed' ? (
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Typed Legal Signature</span>
            <input
              name="signatureTyped"
              required
              minLength={2}
              className="care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm"
              placeholder="Type your full legal name"
            />
            <p className="mt-1 text-xs leading-5 text-[#667085]">
              By typing your name, you confirm this is your legal electronic signature for this document.
            </p>
          </label>
        ) : (
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-[#667085]">Draw Your Signature</span>
            <div className="mt-1">
              <SignaturePad onChange={setSigDrawn} />
            </div>
          </div>
        )}

        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#eadfd6] text-[#f37d6d] focus:ring-[#f37d6d]"
          />
          <span className="text-xs leading-5 text-[#667085]">
            I confirm that the information above is accurate and that this constitutes my legal signature for this document.
          </span>
        </label>

        <button
          type="submit"
          disabled={isPending || !terms || (sigType === 'drawn' && !sigDrawn)}
          className="w-full rounded-full bg-[#f37d6d] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Signing&hellip;
            </span>
          ) : (
            'Complete Signature'
          )}
        </button>
      </div>
    </form>
  )
}
