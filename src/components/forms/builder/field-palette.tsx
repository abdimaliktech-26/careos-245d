'use client'

import { FIELD_TYPES, type FieldType } from '@/types/forms'

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Text Area',
  date: 'Date',
  checkbox: 'Checkbox',
  yesno: 'Yes / No',
  radio: 'Radio',
  select: 'Select',
  contact: 'Contact',
  number: 'Number',
  phone: 'Phone',
  email: 'Email',
  file: 'File',
  signature: 'Signature',
  section_header: 'Section Header',
}

export function FieldPalette({
  onAddField,
}: {
  onAddField: (type: FieldType) => void
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold tracking-[0.08em] text-gray-400 uppercase">Field Types</h3>
      <div className="grid grid-cols-2 gap-1.5">
        {FIELD_TYPES.filter((t) => t !== 'signature').map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onAddField(type)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 hover:border-[#E8799E] hover:text-[#E8799E] hover:bg-[#E8799E]/5 transition-colors text-left"
          >
            {FIELD_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  )
}
