'use client'

import { Suspense, use, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { captureSignatureAndComplete } from '@/lib/forms/actions'

type Props = { params: Promise<{ id: string; assignmentId: string }> }

// Only case managers can sign internally. Client/guardian sign via external portal.
const SIGNER_TYPES = [
  { value: 'case_manager', label: 'Case Manager' },
] as const

type SignerType = typeof SIGNER_TYPES[number]['value']

// Inner component reads search params — must be inside Suspense
function SignatureForm({ clientId, assignmentId }: { clientId: string; assignmentId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [submissionId, setSubmissionId] = useState<string>(
    searchParams.get('submissionId') ?? ''
  )
  const [signerName, setSignerName] = useState('')
  const [signerType] = useState<SignerType>('case_manager')
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    setIsDrawing(true)
    setHasSignature(true)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    e.preventDefault()
    const pos = getPos(e, canvas)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }

  const stopDraw = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasSignature) { setError('Please draw a signature.'); return }
    if (!signerName.trim()) { setError('Please enter your name.'); return }
    if (!submissionId.trim()) { setError('Submission ID is required.'); return }

    const canvas = canvasRef.current
    if (!canvas) return
    const signatureData = canvas.toDataURL('image/png')

    setLoading(true)
    setError(null)
    setNotice(null)

    const result = await captureSignatureAndComplete(
      submissionId, assignmentId, clientId, signerName, signerType, signatureData
    )

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    if (!result.data) {
      setError('Signature saved, but completion status could not be verified.')
      setLoading(false)
      return
    }

    if (!result.data.completed && result.data.alert) {
      setNotice(`Signature saved. Compliance check: ${result.data.alert}`)
      clearCanvas()
      setSignerName('')
      setLoading(false)
      return
    }

    router.push(`/clients/${clientId}`)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {notice && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {notice}
        </p>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <label htmlFor="submissionId" className="block text-xs font-medium text-gray-600 mb-1.5">
          Submission ID <span className="text-red-500">*</span>
        </label>
        <input
          id="submissionId"
          type="text"
          required
          value={submissionId}
          onChange={(e) => setSubmissionId(e.target.value)}
          placeholder="Auto-filled when arriving from form fill page"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 font-mono"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 text-sm">Signer Information</h2>
        <p className="text-xs text-gray-500">
          Only case managers can sign here. Client/guardian signatures are collected via their secure signing link.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="signerName" className="block text-xs font-medium text-gray-600 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="signerName"
              type="text"
              required
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Role
            </label>
            <div className="flex h-[38px] items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm font-medium text-gray-700">
              Case Manager
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 text-sm">Signature</h2>
          <button
            type="button"
            onClick={clearCanvas}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear
          </button>
        </div>
        <div className="border-2 border-dashed border-gray-200 rounded-lg overflow-hidden touch-none bg-gray-50">
          <canvas
            ref={canvasRef}
            width={560}
            height={180}
            className="w-full cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        {!hasSignature && (
          <p className="text-xs text-gray-400 mt-2 text-center">Draw your signature in the box above</p>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !hasSignature}
          className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#8B4B2D' }}
        >
          {loading ? 'Saving…' : 'Complete & Sign'}
        </button>
      </div>
    </form>
  )
}

export default function SignaturePage({ params }: Props) {
  const { id: clientId, assignmentId } = use(params)

  return (
    <div className="max-w-2xl mx-auto">
      <Link href={`/clients/${clientId}`} className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to client profile
      </Link>

      <div className="mt-4 mb-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase mb-1">
          Signature Capture
        </p>
        <h1 className="text-2xl font-bold text-gray-900">Collect Signature</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Sign as case manager. Client/guardian signatures are collected via their secure signing link.
        </p>
      </div>

      <Suspense fallback={<div className="text-sm text-gray-400 py-4">Loading…</div>}>
        <SignatureForm clientId={clientId} assignmentId={assignmentId} />
      </Suspense>
    </div>
  )
}
