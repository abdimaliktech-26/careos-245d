'use client'

import { useState, useEffect, useCallback } from 'react'
import type { FormSchema } from '@/types/forms'
import { FormSection } from './form-section'
import { Button } from '@/components/ui/button'
import { CarryForwardBanner } from './carry-forward-banner'
import type { CarryForwardSuggestion } from '@/lib/forms/auto-fill-memory'

type FormRendererProps = {
  schema: FormSchema
  initialValues?: Record<string, unknown>
  onSaveDraft: (values: Record<string, unknown>) => Promise<void>
  onSubmit: (values: Record<string, unknown>) => Promise<void>
  clientName?: string
  clientId?: string
  templateCode?: string
  packetFormId?: string
}

export function FormRenderer({
  schema,
  initialValues = {},
  onSaveDraft,
  onSubmit,
  clientName,
  clientId,
  templateCode,
  packetFormId,
}: FormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [aiFillDescription, setAiFillDescription] = useState('')
  const [aiFilling, setAiFilling] = useState(false)
  const [aiFillError, setAiFillError] = useState<string | null>(null)
  const [generatingNarrative, setGeneratingNarrative] = useState(false)
  const [narrativeError, setNarrativeError] = useState<string | null>(null)
  const [carryForwardSuggestions, setCarryForwardSuggestions] = useState<CarryForwardSuggestion[]>([])
  const [appliedFields, setAppliedFields] = useState<Set<string>>(new Set())
  const [, setCarryForwardLoading] = useState(false)

  const fieldKeysCsv = schema.sections.flatMap((s) => s.fields.map((f) => f.id)).join(',')

  useEffect(() => {
    if (!clientId || !templateCode) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCarryForwardLoading(true)
    fetch(`/api/forms/carry-forward?clientId=${clientId}&templateCode=${templateCode}&fieldKeys=${fieldKeysCsv}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.suggestions) setCarryForwardSuggestions(data.suggestions)
      })
      .catch(() => {})
      .finally(() => setCarryForwardLoading(false))
  }, [clientId, templateCode, fieldKeysCsv])

  const carryForwardMap = new Map(
    carryForwardSuggestions
      .filter((s) => !appliedFields.has(s.fieldKey))
      .map((s) => [s.fieldKey, s])
  )

  const handleApplyCarryForward = useCallback((fieldKey: string) => {
    const suggestion = carryForwardSuggestions.find((s) => s.fieldKey === fieldKey)
    if (!suggestion) return
    setValues((prev) => ({ ...prev, [fieldKey]: suggestion.previousValue }))
    setAppliedFields((prev) => new Set(prev).add(fieldKey))
  }, [carryForwardSuggestions])

  const handleApplyAllCarryForward = useCallback(async () => {
    if (!packetFormId) {
      for (const s of carryForwardSuggestions) {
        handleApplyCarryForward(s.fieldKey)
      }
      return
    }
    try {
      const res = await fetch('/api/forms/carry-forward/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packetFormId, suggestions: carryForwardSuggestions }),
      })
      const data = await res.json()
      if (data.ok) {
        for (const s of carryForwardSuggestions) {
          setValues((prev) => ({ ...prev, [s.fieldKey]: s.previousValue }))
        }
        setAppliedFields(new Set(carryForwardSuggestions.map((s) => s.fieldKey)))
      }
    } catch {}
  }, [carryForwardSuggestions, packetFormId, handleApplyCarryForward])

  const handleChange = (fieldId: string, value: unknown) =>
    setValues((prev) => ({ ...prev, [fieldId]: value }))

  const handleSaveDraft = async () => {
    setSaving(true)
    await onSaveDraft(values)
    setSavedAt(new Date().toLocaleTimeString())
    setSaving(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const missing = schema.sections.flatMap((section) =>
      section.fields.filter((field) => {
        if (!field.required || field.type === 'section_header' || field.type === 'signature') return false
        const value = values[field.id]
        if (Array.isArray(value)) return value.length === 0
        if (typeof value === 'boolean') return !value
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).every((item) => !String(item ?? '').trim())
        }
        return !String(value ?? '').trim()
      })
    )
    if (missing.length > 0) {
      setValidationError(`Complete required fields before signature: ${missing.slice(0, 3).map((field) => field.label).join(', ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}.`)
      return
    }

    setSubmitting(true)
    setValidationError(null)
    await onSubmit(values)
    setSubmitting(false)
  }

  const isNarrativeField = (id: string) => {
    const allFields = schema.sections.flatMap((s) => s.fields)
    const field = allFields.find((f) => f.id === id)
    return field?.type === 'textarea' && (field.label.toLowerCase().includes('narrative') || field.label.toLowerCase().includes('summary') || field.label.toLowerCase().includes('description'))
  }

  const handleAiFill = async () => {
    if (!aiFillDescription.trim()) return
    setAiFilling(true)
    setAiFillError(null)
    try {
      const res = await fetch('/api/ai/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, description: aiFillDescription }),
      })
      const data = await res.json()
      if (data.error) { setAiFillError(data.error); return }
      setValues((prev) => ({ ...prev, ...data.values }))
      setAiFillDescription('')
    } catch {
      setAiFillError('Failed to connect to AI service')
    } finally {
      setAiFilling(false)
    }
  }

  const handleGenerateNarrative = async () => {
    setGeneratingNarrative(true)
    setNarrativeError(null)
    try {
      const allFields = schema.sections.flatMap((s) => s.fields)
      const narrativeField = allFields.find((f) => isNarrativeField(f.id))
      if (!narrativeField) { setNarrativeError('No narrative field found in this form'); setGeneratingNarrative(false); return }

      const fields = allFields
        .filter((f) => f.type !== 'section_header' && f.type !== 'signature' && values[f.id] !== undefined && values[f.id] !== null && values[f.id] !== '')
        .map((f) => ({ label: f.label, value: String(values[f.id] ?? '') }))

      const res = await fetch('/api/ai/generate-narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formTitle: schema.title, clientName, fields }),
      })
      const data = await res.json()
      if (data.error) { setNarrativeError(data.error); return }
      setValues((prev) => ({ ...prev, [narrativeField.id]: data.narrative }))
    } catch {
      setNarrativeError('Failed to generate narrative')
    } finally {
      setGeneratingNarrative(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{schema.title}</h2>
        {schema.description && <p className="text-sm text-gray-500 mt-1">{schema.description}</p>}
      </div>

      {validationError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {validationError}
        </p>
      )}

      {carryForwardSuggestions.length > 0 && (
        <CarryForwardBanner
          templateName={schema.title}
          suggestionCount={carryForwardSuggestions.length}
          onApplyAll={handleApplyAllCarryForward}
          onReviewIndividual={() => {}}
          onDismiss={() => setCarryForwardSuggestions([])}
        />
      )}

      <div className="rounded-2xl border border-[#E8799E]/20 bg-[#EEF2FF] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-[#E8799E]">AI Assistant</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGenerateNarrative}
              disabled={generatingNarrative || aiFilling}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {generatingNarrative ? 'Generating…' : 'Generate Narrative'}
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiFillDescription}
            onChange={(e) => setAiFillDescription(e.target.value)}
            placeholder="Describe the visit in natural language to auto-fill the form…"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAiFill() } }}
          />
          <Button type="button" loading={aiFilling} onClick={handleAiFill} disabled={!aiFillDescription.trim() || generatingNarrative}>
            Fill with AI
          </Button>
        </div>
        {aiFillError && <p className="text-xs text-red-600">{aiFillError}</p>}
        {narrativeError && <p className="text-xs text-red-600">{narrativeError}</p>}
      </div>

      {schema.sections.map((section, idx) => (
        <FormSection
          key={idx}
          section={section}
          values={values}
          onChange={handleChange}
          carryForwardMap={carryForwardMap}
          onApplyCarryForward={handleApplyCarryForward}
        />
      ))}

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-green-600">{savedAt ? `Draft saved at ${savedAt}` : ''}</span>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" loading={saving} onClick={handleSaveDraft}>
            Save Draft
          </Button>
          <Button type="submit" loading={submitting}>
            Submit for Signatures
          </Button>
        </div>
      </div>
    </form>
  )
}
