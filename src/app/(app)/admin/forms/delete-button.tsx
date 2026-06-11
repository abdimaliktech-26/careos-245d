'use client'

import { useRouter } from 'next/navigation'
import { deleteTemplate } from '@/lib/forms/builder-actions'

export function DeleteTemplateButton({ id }: { id: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Delete this template? This cannot be undone.')) return
    const result = await deleteTemplate(id)
    if (!result.error) router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
    >
      Delete
    </button>
  )
}
