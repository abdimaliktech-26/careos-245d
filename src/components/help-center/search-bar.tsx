'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { searchArticles } from '@/lib/help-center/actions'
import type { HelpArticle } from '@/lib/help-center/actions'

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
  )
}

export function HelpSearchBar() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HelpArticle[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }
    setLoading(true)
    const { data } = await searchArticles(q)
    setResults(data ?? [])
    setIsOpen(true)
    setLoading(false)
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 250)
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          <SearchIcon />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setIsOpen(true) }}
          placeholder="Search articles..."
          className="w-full rounded-xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/15 focus:border-ring transition-colors"
        />
        {loading && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-[#DB2777]" />
          </span>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-border bg-card shadow-lg z-50 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {query.trim() ? 'No articles found.' : 'Start typing to search...'}
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {results.map((article) => (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    setQuery('')
                    router.push(`/help/${article.slug}`)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{article.title}</p>
                  {article.excerpt && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{article.excerpt}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-primary capitalize">
                      {article.category}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
