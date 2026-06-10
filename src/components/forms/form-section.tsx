'use client'

import type { FormSection as FormSectionType } from '@/types/forms'
import { SmartField } from './smart-field'
import type { CarryForwardSuggestion } from '@/lib/forms/auto-fill-memory'

type FormSectionProps = {
  section: FormSectionType
  values: Record<string, unknown>
  onChange: (fieldId: string, value: unknown) => void
  carryForwardMap?: Map<string, CarryForwardSuggestion>
  onApplyCarryForward?: (fieldId: string) => void
}

export function FormSection({ section, values, onChange, carryForwardMap, onApplyCarryForward }: FormSectionProps) {
  return (
    <section className="care-panel rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-800">{section.title}</h3>
        {section.description && <p className="text-xs text-gray-500 mt-1">{section.description}</p>}
      </div>

      {section.fields.map((field) => {
        const value = values[field.id]
        const carryForward = carryForwardMap?.get(field.id)

        if (['text', 'textarea', 'email', 'phone', 'number', 'date', 'radio', 'checkbox', 'select', 'contact', 'signature', 'section_header'].includes(field.type)) {
          return (
            <SmartField
              key={field.id}
              field={field}
              value={value}
              onChange={(v) => onChange(field.id, v)}
              carryForward={carryForward}
              onApplyCarryForward={onApplyCarryForward ? () => onApplyCarryForward(field.id) : undefined}
            />
          )
        }
        return null
      })}
    </section>
  )
}
