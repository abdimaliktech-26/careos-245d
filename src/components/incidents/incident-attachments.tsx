'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Attachment = {
  id: string
  name: string
  category: string
  storage_path: string
  created_at: string
}

export function IncidentAttachments({ incidentId }: { incidentId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('documents')
      .select('id, name, category, storage_path, created_at')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAttachments((data ?? []) as Attachment[])
        setLoading(false)
      })
  }, [incidentId])

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h2 className="text-xs font-semibold tracking-[0.08em] text-gray-400 uppercase mb-3">Attachments</h2>
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-gray-400">No attachments</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#3A2A4A] truncate">{a.name}</p>
                <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
              <a
                href={`/api/documents/${a.id}/download`}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Download
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
