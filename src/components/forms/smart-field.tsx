'use client'

import { useState } from 'react'
import type { FormField } from '@/types/forms'
import { TextField } from './field-types/text-field'
import { DateField } from './field-types/date-field'
import { YesNoField } from './field-types/yesno-field'
import { CheckboxField } from './field-types/checkbox-field'
import { SelectField } from './field-types/select-field'
import { ContactField } from './field-types/contact-field'

type CarryForward = {
  previousValue: unknown
  label: string
  confidence: 'high' | 'medium' | 'low'
}

type SmartFieldProps = {
  field: FormField
  value: unknown
  onChange: (value: unknown) => void
  carryForward?: CarryForward
  onApplyCarryForward?: () => void
}

export function SmartField({ field, value, onChange, carryForward, onApplyCarryForward }: SmartFieldProps) {
  const [showPrevious, setShowPrevious] = useState(false)
  const hasValue = value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && value.length === 0)
  const showIndicator = !!carryForward && !hasValue

  const renderField = () => {
    if (['text', 'textarea', 'email', 'phone', 'number'].includes(field.type)) {
      return <TextField field={field} value={(value as string) ?? ''} onChange={onChange} />
    }
    if (field.type === 'date') {
      return <DateField field={field} value={(value as string) ?? ''} onChange={onChange} />
    }
    if (field.type === 'radio') {
      return <YesNoField field={field} value={(value as string) ?? ''} onChange={onChange} />
    }
    if (field.type === 'checkbox') {
      return <CheckboxField field={field} value={(value as boolean | string[]) ?? false} onChange={onChange} />
    }
    if (field.type === 'select') {
      return <SelectField field={field} value={(value as string) ?? ''} onChange={onChange} />
    }
    if (field.type === 'contact') {
      return <ContactField field={field}
        value={(value as { name: string; phone: string; address: string }) ?? { name: '', phone: '', address: '' }}
        onChange={onChange} />
    }
    if (field.type === 'signature') {
      return (
        <div className="rounded-md border border-dashed border-gray-300 bg-muted px-3 py-4 text-sm text-muted-foreground">
          {field.label} signatures are collected on the signature step.
        </div>
      )
    }
    if (field.type === 'section_header') {
      return <h4 className="text-sm font-semibold text-foreground">{field.label}</h4>
    }
    return null
  }

  const formatPreviousValue = (v: unknown): string => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'string') return v
    if (typeof v === 'boolean') return v ? 'Yes' : 'No'
    if (Array.isArray(v)) return v.join(', ')
    if (typeof v === 'object') {
      try { return JSON.stringify(v) } catch { return String(v) }
    }
    return String(v)
  }

  return (
    <div className="relative">
      {renderField()}

      {showIndicator && (
        <div className="mt-1.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPrevious(!showPrevious)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-[#C06080] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            {showPrevious ? 'Hide' : 'Show'} previous answer
          </button>
        </div>
      )}

      {showPrevious && carryForward && (
        <div className="mt-1.5 rounded-lg border border-primary/20 bg-accent/50 px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-medium text-muted-foreground shrink-0">Previously:</span>
              <span className="text-[12px] text-foreground truncate">
                {formatPreviousValue(carryForward.previousValue)}
              </span>
              {carryForward.confidence === 'high' && (
                <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-semibold text-green-700 uppercase">
                  High
                </span>
              )}
            </div>
            {onApplyCarryForward && (
              <button
                type="button"
                onClick={onApplyCarryForward}
                className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#C06080] transition-colors"
              >
                Apply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
