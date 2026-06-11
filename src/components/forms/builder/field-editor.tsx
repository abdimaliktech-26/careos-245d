'use client'

import { FIELD_TYPES, type FieldType, type BuilderField, type BuilderFieldOption } from '@/types/forms'

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Text', textarea: 'Text Area', date: 'Date', checkbox: 'Checkbox',
  yesno: 'Yes / No', radio: 'Radio', select: 'Select', contact: 'Contact',
  number: 'Number', phone: 'Phone', email: 'Email', file: 'File',
  signature: 'Signature', section_header: 'Section Header',
}

function generateKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40) || 'field'
}

export function FieldEditor({
  field,
  onChange,
}: {
  field: BuilderField
  onChange: (f: BuilderField) => void
}) {
  const needsOptions = ['select', 'radio', 'checkbox'].includes(field.type)

  const addOption = () => {
    const val = `opt_${field.options.length + 1}`
    onChange({
      ...field,
      options: [...field.options, { label: '', value: val }],
    })
  }

  const updateOption = (i: number, key: keyof BuilderFieldOption, value: string) => {
    const next = [...field.options]
    next[i] = { ...next[i], [key]: value }
    onChange({ ...field, options: next })
  }

  const removeOption = (i: number) => {
    onChange({ ...field, options: field.options.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Field Properties</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-foreground mb-1">Label</label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => {
              const label = e.target.value
              onChange({
                ...field,
                label,
                fieldKey: field.fieldKey || generateKey(label),
              })
            }}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-xs font-medium text-foreground mb-1">Field Key</label>
          <input
            type="text"
            value={field.fieldKey}
            onChange={(e) => onChange({ ...field, fieldKey: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Type</label>
          <select
            value={field.type}
            onChange={(e) => {
              const newType = e.target.value as FieldType
              onChange({
                ...field,
                type: newType,
                options: ['select', 'radio', 'checkbox'].includes(newType) ? field.options : [],
              })
            }}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
          >
            {FIELD_TYPES.map((t) => (
              <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Section</label>
          <input
            type="text"
            value={field.sectionLabel}
            onChange={(e) => onChange({ ...field, sectionLabel: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
            placeholder="General"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={field.isRequired}
            onChange={(e) => onChange({ ...field, isRequired: e.target.checked })}
            className="rounded border-gray-300 text-primary focus:ring-ring/15"
          />
          <span className="text-xs text-muted-foreground">Required</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={field.isHipaa}
            onChange={(e) => onChange({ ...field, isHipaa: e.target.checked })}
            className="rounded border-gray-300 text-primary focus:ring-ring/15"
          />
          <span className="text-xs text-muted-foreground">HIPAA</span>
        </label>
      </div>

      {field.type !== 'section_header' && field.type !== 'yesno' && field.type !== 'contact' && (
        <>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Placeholder</label>
            <input
              type="text"
              value={field.placeholder ?? ''}
              onChange={(e) => onChange({ ...field, placeholder: e.target.value || null })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Help Text</label>
            <input
              type="text"
              value={field.helpText ?? ''}
              onChange={(e) => onChange({ ...field, helpText: e.target.value || null })}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
            />
          </div>
        </>
      )}

      {needsOptions && (
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Options</label>
          <div className="space-y-1.5">
            {field.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => updateOption(i, 'label', e.target.value)}
                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
                  placeholder="Option label"
                />
                <input
                  type="text"
                  value={opt.value}
                  onChange={(e) => updateOption(i, 'value', e.target.value)}
                  className="w-24 rounded-lg border border-border px-2 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
                  placeholder="value"
                />
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="text-xs text-primary hover:underline"
            >
              + Add option
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
