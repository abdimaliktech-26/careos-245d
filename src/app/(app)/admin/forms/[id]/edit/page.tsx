import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { loadTemplate } from '@/lib/forms/builder-actions'
import { FormBuilder } from '@/components/forms/builder/form-builder'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
}

export default async function EditFormTemplatePage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  const { id } = await params
  const result = await loadTemplate(id)
  if (result.error || !result.data) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-500">{result.error ?? 'Template not found'}</p>
        <Link href="/admin/forms" className="text-sm text-primary hover:underline mt-2 inline-block">
          Back to templates
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">Admin</p>
        <h1 className="text-3xl font-bold text-foreground">Edit: {result.data.name}</h1>
        <p className="text-muted-foreground mt-1">Modify fields, sections, and settings for this template.</p>
      </div>
      <FormBuilder initial={result.data} />
    </div>
  )
}
