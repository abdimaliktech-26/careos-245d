'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { deleteDocument } from '@/lib/document-vault/actions'

type Document = Record<string, unknown>

function getFileIcon(mimeType: string | null): { icon: string; bg: string; color: string } {
  if (!mimeType) return { icon: '📄', bg: 'bg-muted', color: 'text-muted-foreground' }
  if (mimeType.startsWith('image/')) return { icon: '🖼', bg: 'bg-purple-50', color: 'text-purple-600' }
  if (mimeType === 'application/pdf') return { icon: '📕', bg: 'bg-red-50', color: 'text-red-600' }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return { icon: '📊', bg: 'bg-green-50', color: 'text-green-600' }
  if (mimeType.includes('word') || mimeType.includes('document'))
    return { icon: '📝', bg: 'bg-blue-50', color: 'text-blue-600' }
  return { icon: '📄', bg: 'bg-muted', color: 'text-muted-foreground' }
}

function canPreview(mimeType: string | null): boolean {
  if (!mimeType) return false
  if (mimeType.startsWith('image/')) return true
  if (mimeType === 'application/pdf') return true
  return false
}

export function DocumentListClient({ documents }: { documents: Array<Document> }) {
  const router = useRouter()
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = useCallback(async (id: string) => {
    setDeleting(true)
    setDeleteError(null)
    const result = await deleteDocument(id)
    if (result.error) {
      setDeleteError(result.error)
      setDeleting(false)
      return
    }
    setDeleteConfirm(null)
    setDeleting(false)
    router.refresh()
  }, [router])

  const downloadUrl = (id: string) => `/api/documents/${id}/download`

  return (
    <>
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="divide-y divide-border/60">
          {documents.map((doc) => {
            const mimeType = (doc.mime_type as string | null) ?? null
            const fi = getFileIcon(mimeType)
            const client = doc.clients as { legal_name: string } | null
            const staffProfile = doc.staff_profiles as { full_name: string } | null

            return (
              <div key={doc.id as string} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40/80 transition-colors group">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${fi.bg} text-base`}>
                  {fi.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug truncate">{doc.display_name as string}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span>{client?.legal_name ?? staffProfile?.full_name ?? '—'}</span>
                    <span>·</span>
                    <span>{doc.file_size ? `${Math.ceil(Number(doc.file_size) / 1024)} KB` : '—'}</span>
                    <span>·</span>
                    <span>{doc.created_at ? new Date(doc.created_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {canPreview(mimeType) && (
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-muted/40 transition-colors"
                    >
                      Preview
                    </button>
                  )}
                  <a
                    href={downloadUrl(doc.id as string)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-accent hover:border-border hover:text-primary transition-colors"
                  >
                    Download
                  </a>
                  <a
                    href={`/api/documents/${doc.id as string}/pdf`}
                    target="_blank"
                    className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600 transition-colors"
                  >
                    PDF
                  </a>
                  <button
                    onClick={() => setDeleteConfirm(doc.id as string)}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-[10px] font-semibold text-red-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-card rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <p className="text-sm font-bold text-foreground">{previewDoc.display_name as string}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(previewDoc.mime_type as string) ?? 'Unknown type'}</p>
              </div>
              <button onClick={() => setPreviewDoc(null)} className="text-muted-foreground hover:text-muted-foreground">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-muted/40 flex items-center justify-center min-h-[300px]">
              {(previewDoc.mime_type as string)?.startsWith('image/') ? (
                <Image
                  src={downloadUrl(previewDoc.id as string)}
                  alt={previewDoc.display_name as string}
                  width={1200}
                  height={800}
                  unoptimized
                  className="max-w-full max-h-[65vh] rounded-xl shadow-sm object-contain"
                />
              ) : (previewDoc.mime_type as string) === 'application/pdf' ? (
                <iframe
                  src={downloadUrl(previewDoc.id as string)}
                  className="w-full h-[65vh] rounded-xl"
                  title={previewDoc.display_name as string}
                />
              ) : (
                <div className="text-center py-12">
                  <p className="text-4xl mb-3">📄</p>
                  <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
                  <a
                    href={downloadUrl(previewDoc.id as string)}
                    className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
                  >
                    Download to view
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => { setDeleteConfirm(null); setDeleteError(null) }}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </div>
            <p className="text-sm font-bold text-foreground mb-1">Delete Document</p>
            <p className="text-xs text-muted-foreground mb-4">This will permanently delete the document and its file. This action cannot be undone.</p>
            {deleteError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{deleteError}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setDeleteConfirm(null); setDeleteError(null) }} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deleting} className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-40">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
