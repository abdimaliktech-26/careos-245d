'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FormRenderer } from '@/components/forms/form-renderer'
import {
  getFormAssignment,
  getExistingDraft,
  saveFormDraft,
  submitFormForSignatures,
  type PacketFormWithTemplate,
} from '@/lib/forms/actions'
import { getClientById } from '@/lib/clients/actions'
import type { FormSchema } from '@/types/forms'

type Props = { params: Promise<{ id: string; assignmentId: string }> }

const SET_LABELS: Record<string, string> = {
  intake: 'Intake',
  '45_day_review': '45-Day Review',
  semi_annual_review: 'Semi-Annual',
  annual_review: 'Annual',
}

export default function FormFillPage({ params }: Props) {
  const { id: clientId, assignmentId } = use(params)
  const router = useRouter()

  const [assignment, setAssignment] = useState<PacketFormWithTemplate | null>(null)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>({})
  const [submissionId, setSubmissionId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientName, setClientName] = useState('')

  useEffect(() => {
    async function load() {
      const [assignmentResult, draftResult] = await Promise.all([
        getFormAssignment(assignmentId),
        getExistingDraft(assignmentId),
      ])

      if (assignmentResult.error || !assignmentResult.data) {
        setError(assignmentResult.error ?? 'Form not found')
        setLoading(false)
        return
      }

      const { data: clientData } = await getClientById(clientId)
      if (clientData) setClientName(clientData.legal_name)

      const a = assignmentResult.data.packetForm
      setAssignment(a)
      setSchema(assignmentResult.data.schema)

      if (draftResult.data) {
        setInitialValues(draftResult.data.form_data)
        setSubmissionId(draftResult.data.id)
      }

      setLoading(false)
    }
    load()
  }, [assignmentId, clientId])

  const handleSaveDraft = async (values: Record<string, unknown>) => {
    if (!assignment) return
    const result = await saveFormDraft(
      assignmentId, clientId,
      assignment.form_templates.id, values, submissionId
    )
    if (result.data && !submissionId) setSubmissionId(result.data.id)
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (!assignment) return
    const result = await submitFormForSignatures(
      assignmentId, clientId,
      assignment.form_templates.id, values, submissionId
    )
    if (result.error) { setError(result.error); return }
    // Redirect to signature capture page with the submission ID pre-filled
    router.push(
      `/clients/${clientId}/forms/${assignmentId}/sign?submissionId=${result.data!.submissionId}`
    )
  }

  if (loading) {
    return <div className="max-w-3xl mx-auto py-12 text-center text-gray-400 text-sm">Loading form…</div>
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-8">
        <p className="text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 text-sm">{error}</p>
        <Link href={`/clients/${clientId}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to client
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/clients/${clientId}`} className="text-sm text-gray-500 hover:text-gray-700">
        ← Back to client profile
      </Link>

      <div className="flex items-center gap-2 mt-3 mb-1">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase tracking-wide">
          {SET_LABELS[assignment?.packet_type ?? ''] ?? assignment?.packet_type}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {assignment?.form_templates?.code}
        </span>
        {assignment?.due_date && (
          <span className="text-xs text-gray-400">
            · Due {new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
      </div>

      {schema && (
        <FormRenderer
          schema={schema}
          initialValues={initialValues}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmit}
          clientName={clientName}
        />
      )}
    </div>
  )
}
