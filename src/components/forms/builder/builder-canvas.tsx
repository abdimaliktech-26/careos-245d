'use client'

import type { BuilderField } from '@/types/forms'

const FIELD_TYPE_PREVIEW: Record<string, string> = {
  text: 'Single line text',
  textarea: 'Multi-line text',
  date: 'Date picker',
  checkbox: 'Checkbox (multiple)',
  yesno: 'Yes / No radio',
  radio: 'Radio buttons',
  select: 'Dropdown select',
  contact: 'Name, Phone, Address',
  number: 'Numeric input',
  phone: 'Phone input',
  email: 'Email input',
  file: 'File upload',
  section_header: 'Section heading',
}

export function BuilderCanvasField({
  field,
  index,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  field: BuilderField
  index: number
  isSelected: boolean
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-lg border px-4 py-3 cursor-pointer transition-all ${
        isSelected
          ? 'border-[#E8799E] bg-[#E8799E]/5 ring-1 ring-[#E8799E]/20'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-mono text-gray-400 w-5 shrink-0">{index + 1}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{field.label || <span className="text-gray-400 italic">Untitled field</span>}</p>
            <p className="text-[11px] text-gray-500">
              {field.sectionLabel !== 'General' && <span className="text-[#E8799E]">{field.sectionLabel} · </span>}
              {FIELD_TYPE_PREVIEW[field.type] ?? field.type}
              {field.isRequired && <span className="text-rose-500"> · Required</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveUp() }}
            disabled={index === 0}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-20"
            title="Move up"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveDown() }}
            disabled={index === 0}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-20"
            title="Move down"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
            title="Delete field"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export function BuilderCanvasEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5" className="mb-3">
        <path d="M12 5v14M5 12h14"/>
      </svg>
      <p className="text-sm font-medium text-gray-400">No fields yet</p>
      <p className="text-xs text-gray-300 mt-1">Click a field type from the palette to add it</p>
    </div>
  )
}
