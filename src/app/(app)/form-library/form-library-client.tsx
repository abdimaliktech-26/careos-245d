'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type FormFieldRaw = {
  field_key: string
  label: string
  field_type: string
  is_required: boolean
  section_label: string | null
  sort_order: number
}

type FormDef = {
  id: string
  code: string
  name: string
  description: string | null
  packet_types: string[]
  sort_order: number
  form_fields: FormFieldRaw[]
  is_active: boolean
}

type Props = {
  forms: FormDef[]
  role: string
}

export function FormLibraryClient({ forms, role }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const canEdit = ['org_admin', 'super_admin', 'program_manager'].includes(role)

  const filtered = useMemo(
    () => forms.filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.code.toLowerCase().includes(search.toLowerCase())
    ),
    [forms, search]
  )

  const selected = useMemo(
    () => filtered.find((f) => f.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  )

  const sectionCount = (fields: FormFieldRaw[]) => {
    if (!fields || fields.length === 0) return 0
    const unique = new Set(
      fields.map((f) => f.section_label ?? 'General')
    )
    return unique.size
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">Library</p>
        <h1 className="text-3xl font-bold text-foreground">245D Form Library</h1>
        <p className="text-muted-foreground mt-1">All digital forms available to your organization. Preview structure & required fields.</p>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setSelectedId(null) }}
          placeholder="Search by name or code…"
          className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Templates list */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Templates ({filtered.length})
            </p>
          </div>
          <div className="divide-y divide-border/60 max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-5 py-12 text-center text-muted-foreground text-sm">
                {search
                  ? 'No templates match your search.'
                  : 'No form templates found. Run migrations to load forms.'}
              </div>
            ) : (
              filtered.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`px-5 py-4 hover:bg-muted/40 cursor-pointer transition-colors ${
                    f.id === selected?.id
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{f.name}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {f.form_fields && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {f.form_fields.length}f
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {sectionCount(f.form_fields)}s
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.code}</p>
                  {f.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{f.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Form preview */}
        {selected ? (
          <div className="lg:col-span-3 bg-card rounded-xl border border-border">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {selected.code}
                </p>
                <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
              </div>
              {canEdit && (
                <Link
                  href={`/admin/forms/${encodeURIComponent(selected.id)}/edit`}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-muted/40 transition-colors shrink-0"
                >
                  Edit
                </Link>
              )}
            </div>
            <div className="px-6 py-5">
              {selected.description && (
                <p className="text-sm text-muted-foreground mb-4 pb-4 border-b border-border">{selected.description}</p>
              )}
              {selected.form_fields?.length ? (
                <div className="space-y-6">
                  {Object.entries(
                    [...selected.form_fields]
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .reduce<Record<string, FormFieldRaw[]>>((acc, field) => ({
                        ...acc,
                        [field.section_label ?? 'General']: [...(acc[field.section_label ?? 'General'] ?? []), field],
                      }), {})
                  ).map(([section, fields]) => (
                    <div key={section}>
                      <h3 className="font-semibold text-foreground mb-3">{section}</h3>
                      <ul className="space-y-2">
                        {fields.map((field) => (
                          <li key={field.field_key} className="flex items-center gap-2 text-sm text-foreground">
                            <span className="text-muted-foreground">•</span>
                            <span>{field.label}</span>
                            <span className="text-xs text-muted-foreground uppercase">({field.field_type})</span>
                            {field.is_required && (
                              <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Required</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Fields not yet populated. Run the form template migration to load field definitions.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-3 bg-card rounded-xl border border-border px-6 py-12 text-center text-muted-foreground text-sm">
            {filtered.length === 0 ? 'No templates found.' : 'Select a form to preview its fields.'}
          </div>
        )}
      </div>
    </div>
  )
}
