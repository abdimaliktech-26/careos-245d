'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { BuilderTemplate, BuilderField, FieldType } from '@/types/forms'
import { saveTemplate } from '@/lib/forms/builder-actions'
import { TemplateSettingsForm } from './template-settings'
import { FieldPalette } from './field-palette'
import { FieldEditor } from './field-editor'
import { BuilderCanvasField, BuilderCanvasEmpty } from './builder-canvas'

function generateId(): string {
  return crypto.randomUUID?.() ?? `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function createField(type: FieldType, sortOrder: number): BuilderField {
  const baseKey = type
  return {
    id: generateId(),
    sectionLabel: 'General',
    fieldKey: `${baseKey}_${sortOrder + 1}`,
    label: '',
    type,
    isRequired: false,
    isHipaa: false,
    options: [],
    placeholder: null,
    helpText: null,
    sortOrder,
    conditionalOn: null,
    conditionalValue: null,
  }
}

type Props = {
  initial: BuilderTemplate
}

export function FormBuilder({ initial }: Props) {
  const router = useRouter()
  const [template, setTemplate] = useState<BuilderTemplate>(initial)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fields = template.fields
  const selectedField = selectedIndex !== null ? fields[selectedIndex] ?? null : null

  const addField = useCallback((type: FieldType) => {
    setTemplate((prev) => ({
      ...prev,
      fields: [...prev.fields, createField(type, prev.fields.length)],
    }))
    setSelectedIndex(null)
  }, [])

  const moveField = useCallback((from: number, direction: 'up' | 'down') => {
    const to = direction === 'up' ? from - 1 : from + 1
    if (to < 0 || to >= fields.length) return
    setTemplate((prev) => {
      const next = [...prev.fields]
      const temp = next[from]!
      next[from] = next[to]!
      next[to] = temp
      return { ...prev, fields: next }
    })
    setSelectedIndex(to)
  }, [fields.length])

  const deleteField = useCallback((index: number) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }))
    setSelectedIndex(null)
  }, [])

  const updateField = useCallback((updated: BuilderField) => {
    setTemplate((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === updated.id ? updated : f)),
    }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const result = await saveTemplate(template)
    if (result.error) {
      setError(result.error)
      setSaving(false)
    } else {
      router.push('/admin/forms')
    }
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-12rem)]">
      {/* Left: Palette + Settings */}
      <div className="w-64 shrink-0 space-y-6 overflow-y-auto">
        <FieldPalette onAddField={addField} />
        <TemplateSettingsForm template={template} onChange={setTemplate} />
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {fields.length === 0 ? (
            <BuilderCanvasEmpty />
          ) : (
            fields.map((field, i) => (
              <BuilderCanvasField
                key={field.id}
                field={field}
                index={i}
                isSelected={selectedIndex === i}
                onSelect={() => setSelectedIndex(i)}
                onMoveUp={() => moveField(i, 'up')}
                onMoveDown={() => moveField(i, 'down')}
                onDelete={() => deleteField(i)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right: Field Editor */}
      <div className="w-72 shrink-0 overflow-y-auto">
        {selectedField ? (
          <FieldEditor
            key={selectedField.id}
            field={selectedField}
            onChange={updateField}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-gray-400">Select a field to edit its properties</p>
          </div>
        )}
      </div>

      {/* Floating save bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <div>
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <p className="text-xs text-gray-400">
              {fields.length} field{fields.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/admin/forms')}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !template.name || !template.code}
              className="rounded-lg bg-[#E8799E] px-5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? 'Saving...' : template.id ? 'Update Template' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
