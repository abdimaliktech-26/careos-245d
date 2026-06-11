'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createArticle, updateArticle } from '@/lib/help-center/actions'
import type { HelpArticle } from '@/lib/help-center/actions'

const CATEGORIES = [
  { value: 'getting-started', label: 'Getting Started' },
  { value: 'forms-packets', label: 'Forms & Packets' },
  { value: 'clients-staff', label: 'Clients & Staff' },
  { value: 'billing', label: 'Billing' },
  { value: 'incidents', label: 'Incidents' },
  { value: 'evv', label: 'EVV' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'faq', label: 'FAQ' },
  { value: 'general', label: 'General' },
]

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

interface ArticleEditorProps {
  article?: HelpArticle
}

export function ArticleEditor({ article }: ArticleEditorProps) {
  const router = useRouter()
  const isEdit = !!article
  const [title, setTitle] = useState(article?.title ?? '')
  const [slug, setSlug] = useState(article?.slug ?? '')
  const [content, setContent] = useState(article?.content ?? '')
  const [excerpt, setExcerpt] = useState(article?.excerpt ?? '')
  const [category, setCategory] = useState(article?.category ?? 'general')
  const [tagsStr, setTagsStr] = useState(article?.tags?.join(', ') ?? '')
  const [isPublished, setIsPublished] = useState(article?.is_published ?? true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slugManuallyEdited) {
      setSlug(slugify(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) { setError('Title is required'); return }
    if (!slug.trim()) { setError('Slug is required'); return }
    if (!content.trim()) { setError('Content is required'); return }

    setIsSubmitting(true)

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const input = {
      title: title.trim(),
      slug: slug.trim(),
      content: content.trim(),
      excerpt: excerpt.trim() || undefined,
      category,
      tags,
      is_published: isPublished,
    }

    const result = isEdit
      ? await updateArticle(article!.id, input)
      : await createArticle(input)

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
    } else {
      router.push('/admin/help-center')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-foreground mb-1">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring bg-card"
              placeholder="e.g. How to Create a Client"
              required
            />
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-semibold text-foreground mb-1">
              Slug
            </label>
            <input
              id="slug"
              type="text"
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true) }}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring bg-card font-mono text-muted-foreground"
              placeholder="how-to-create-a-client"
              required
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Auto-generated from title. Edit manually if needed.</p>
          </div>

          <div>
            <label htmlFor="excerpt" className="block text-sm font-semibold text-foreground mb-1">
              Excerpt
            </label>
            <input
              id="excerpt"
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring bg-card"
              placeholder="Brief description shown in search results"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-semibold text-foreground mb-1">
              Content <span className="text-muted-foreground font-normal">(HTML supported)</span>
            </label>
            <textarea
              id="content"
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring bg-card font-mono resize-y"
              placeholder="<h2>Step 1</h2><p>Write your article content in HTML...</p>"
              required
            />
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-foreground mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring bg-card"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="tags" className="block text-sm font-semibold text-foreground mb-1">
              Tags <span className="text-muted-foreground font-normal">(comma separated)</span>
            </label>
            <input
              id="tags"
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              className="w-full rounded-xl border border-border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring bg-card"
              placeholder="e.g. client, intake, onboarding"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only"
              />
              <div className={`h-5 w-9 rounded-full transition-colors ${isPublished ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`h-4 w-4 rounded-full bg-card shadow-sm transition-transform mt-0.5 ${isPublished ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
              </div>
            </div>
            <span className="text-sm font-medium text-foreground">Published</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEdit ? 'Update Article' : 'Create Article'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/help-center')}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
