'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'

export type HelpArticle = {
  id: string
  organization_id: string | null
  title: string
  slug: string
  content: string
  excerpt: string | null
  category: string
  tags: string[]
  is_published: boolean
  created_by: string
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type CategoryWithCount = {
  category: string
  count: number
}

export async function getPublishedArticles(category?: string) {
  const supabase = await createClient()
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Not authenticated' }

  let query = supabase
    .from('help_articles')
    .select('id, title, slug, excerpt, category, tags, created_at, updated_at')
    .eq('is_published', true)
    .or(`organization_id.eq.${user.organizationId},organization_id.is.null`)
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error: dbError } = await query
  if (dbError) return { data: null, error: dbError.message }
  return { data: data as HelpArticle[], error: null }
}

export async function getArticle(slug: string) {
  const supabase = await createClient()
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Not authenticated' }

  const { data, error: dbError } = await supabase
    .from('help_articles')
    .select('*')
    .eq('slug', slug)
    .or(`organization_id.eq.${user.organizationId},organization_id.is.null`)
    .single()

  if (dbError) return { data: null, error: dbError.message }
  return { data: data as HelpArticle, error: null }
}

export async function getCategories() {
  const supabase = await createClient()
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Not authenticated' }

  const { data, error: dbError } = await supabase
    .from('help_articles')
    .select('category')
    .eq('is_published', true)
    .or(`organization_id.eq.${user.organizationId},organization_id.is.null`)

  if (dbError) return { data: null, error: dbError.message }

  const counts: Record<string, number> = {}
  for (const row of data as Pick<HelpArticle, 'category'>[]) {
    counts[row.category] = (counts[row.category] ?? 0) + 1
  }

  const categories: CategoryWithCount[] = Object.entries(counts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  return { data: categories, error: null }
}

export async function searchArticles(query: string) {
  const supabase = await createClient()
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Not authenticated' }

  if (!query.trim()) return { data: [], error: null }

  const { data, error: dbError } = await supabase
    .from('help_articles')
    .select('id, title, slug, excerpt, category, tags, created_at, updated_at')
    .eq('is_published', true)
    .or(`organization_id.eq.${user.organizationId},organization_id.is.null`)
    .or(`title.ilike.%${query}%,content.ilike.%${query}%,excerpt.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(10)

  if (dbError) return { data: null, error: dbError.message }
  return { data: data as HelpArticle[], error: null }
}

export type ArticleInput = {
  title: string
  slug: string
  content: string
  excerpt?: string
  category: string
  tags?: string[]
  is_published?: boolean
}

export async function createArticle(input: ArticleInput) {
  const supabase = await createClient()
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Not authenticated' }
  if (!['org_admin', 'super_admin'].includes(user.role)) return { data: null, error: 'Forbidden' }

  const { data, error: dbError } = await supabase
    .from('help_articles')
    .insert({
      organization_id: user.organizationId,
      title: input.title,
      slug: input.slug,
      content: input.content,
      excerpt: input.excerpt ?? null,
      category: input.category,
      tags: input.tags ?? [],
      is_published: input.is_published ?? true,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (dbError) return { data: null, error: dbError.message }
  return { data: data as HelpArticle, error: null }
}

export async function updateArticle(id: string, input: Partial<ArticleInput>) {
  const supabase = await createClient()
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Not authenticated' }
  if (!['org_admin', 'super_admin'].includes(user.role)) return { data: null, error: 'Forbidden' }

  const updates: Record<string, unknown> = { ...input, updated_by: user.id }
  if (input.tags !== undefined) updates.tags = input.tags
  if (input.is_published !== undefined) updates.is_published = input.is_published

  const { data, error: dbError } = await supabase
    .from('help_articles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (dbError) return { data: null, error: dbError.message }
  return { data: data as HelpArticle, error: null }
}

export async function deleteArticle(id: string) {
  const supabase = await createClient()
  const { user, error } = await getSession()
  if (error || !user) return { error: 'Not authenticated' }
  if (!['org_admin', 'super_admin'].includes(user.role)) return { error: 'Forbidden' }

  const { error: dbError } = await supabase
    .from('help_articles')
    .delete()
    .eq('id', id)

  if (dbError) return { error: dbError.message }
  return { error: null }
}

export async function getAllArticles(orgId?: string) {
  const supabase = await createClient()
  const { user, error } = await getSession()
  if (error || !user) return { data: null, error: 'Not authenticated' }
  if (!['org_admin', 'super_admin'].includes(user.role)) return { data: null, error: 'Forbidden' }

  let query = supabase
    .from('help_articles')
    .select('id, title, slug, excerpt, category, tags, is_published, created_at, updated_at, created_by, updated_by')
    .order('updated_at', { ascending: false })

  if (user.role === 'org_admin' && user.organizationId) {
    query = query.eq('organization_id', user.organizationId)
  } else if (orgId) {
    query = query.eq('organization_id', orgId)
  }

  const { data, error: dbError } = await query
  if (dbError) return { data: null, error: dbError.message }
  return { data: data as HelpArticle[], error: null }
}
