'use client'

import { useRouter } from 'next/navigation'
import { deleteArticle } from '@/lib/help-center/actions'

export function DeleteArticleButton({ id }: { id: string }) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Delete this article? This cannot be undone.')) return
    const result = await deleteArticle(id)
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
