import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { loadAllTemplates } from '@/lib/forms/builder-actions'
import { DeleteTemplateButton } from './delete-button'

export default async function FormLibraryPage() {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin', 'program_manager'].includes(user.role))
    redirect('/dashboard')

  const result = await loadAllTemplates()
  const templates = result.data ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">Admin</p>
          <h1 className="text-3xl font-bold text-foreground">Form Templates</h1>
          <p className="text-muted-foreground mt-1">Manage form templates used across client packets.</p>
        </div>
        <Link
          href="/admin/forms/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        >
          New Template
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {templates.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">No form templates yet.</p>
            <Link href="/admin/forms/new" className="text-sm text-primary hover:underline mt-2 inline-block">
              Create your first template
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-6 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    {t.is_system && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{t.code}</code>
                    <span className="mx-1.5">·</span>
                    {t.field_count} field{t.field_count !== 1 ? 's' : ''}
                  </p>
                  {t.description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/forms/${encodeURIComponent(t.id)}/edit`}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                  >
                    Edit
                  </Link>
                  {!t.is_system && <DeleteTemplateButton id={t.id} />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
