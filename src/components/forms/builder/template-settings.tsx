'use client'

import type { BuilderTemplate } from '@/types/forms'

export function TemplateSettingsForm({
  template,
  onChange,
}: {
  template: BuilderTemplate
  onChange: (t: BuilderTemplate) => void
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">Template Settings</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Code</label>
          <input
            type="text"
            value={template.code}
            onChange={(e) => onChange({ ...template, code: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
            placeholder="e.g. CUSTOM-FORM-01"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Name</label>
          <input
            type="text"
            value={template.name}
            onChange={(e) => onChange({ ...template, name: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
            placeholder="e.g. Custom Form"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Description</label>
        <textarea
          value={template.description}
          onChange={(e) => onChange({ ...template, description: e.target.value })}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring"
          rows={2}
          placeholder="Brief description of this form..."
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">Packet Types</label>
        <div className="flex flex-wrap gap-2">
          {['intake', '45_day_review', 'semi_annual_review', 'annual_review'].map((pt) => (
            <label key={pt} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={template.packetTypes.includes(pt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...template.packetTypes, pt]
                    : template.packetTypes.filter((p) => p !== pt)
                  onChange({ ...template, packetTypes: next })
                }}
                className="rounded border-gray-300 text-primary focus:ring-ring/15"
              />
              <span className="text-xs text-muted-foreground">
                {pt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
