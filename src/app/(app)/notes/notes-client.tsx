'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ShiftNoteForm } from '@/components/notes/shift-note-form'
import { deleteShiftNote } from '@/lib/notes/actions'

type ClientOption = { id: string; legal_name: string }
type NoteRecord = Record<string, unknown>

const MOOD_EMOJI: Record<number, string> = { 1: '😟', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' }
const MOOD_COLOR: Record<number, string> = {
  1: 'text-red-600', 2: 'text-orange-500', 3: 'text-gray-500', 4: 'text-blue-600', 5: 'text-green-600',
}

export function NotesClient({
  notes,
  clients,
  initialClientFilter,
}: {
  notes: NoteRecord[]
  clients: ClientOption[]
  initialClientFilter: string | null
}) {
  const router = useRouter()
  const [clientFilter, setClientFilter] = useState(initialClientFilter ?? '')
  const [editNote, setEditNote] = useState<NoteRecord | null>(null)

  const filteredNotes = clientFilter
    ? notes.filter((n) => n.client_id === clientFilter)
    : notes

  const currentEdit = editNote
    ? {
        id: editNote.id as string,
        client_id: editNote.client_id as string,
        visit_date: editNote.visit_date as string,
        start_time: editNote.start_time as string,
        end_time: editNote.end_time as string,
        service_type: editNote.service_type as string,
        mood_rating: (editNote.mood_rating as number | null) ?? null,
        narrative: editNote.narrative as string,
        goals_addressed: (editNote.goals_addressed as string) ?? null,
        activities: (editNote.activities as string) ?? null,
      }
    : null

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this shift note? This cannot be undone.')) return
    const result = await deleteShiftNote(id)
    if (!result.error) {
      setEditNote(null)
      router.refresh()
    }
  }, [router])

  const handleCancel = useCallback(() => {
    setEditNote(null)
  }, [])

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      {/* Notes list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 shrink-0">
            Filter:
          </span>
          <select
            value={clientFilter}
            onChange={(e) => {
              setClientFilter(e.target.value)
              setEditNote(null)
            }}
            className="care-input rounded-xl border px-3 py-1.5 text-sm flex-1"
          >
            <option value="">All clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.legal_name}</option>
            ))}
          </select>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-lg font-black text-[#111827]">
              {clientFilter ? 'No notes for this client' : 'No shift notes yet'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {clientFilter
                ? 'Select a different client or clear the filter.'
                : 'Staff log visits using the form. All entries appear here.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredNotes.map((note: NoteRecord) => {
              const client = note.clients as { legal_name: string } | null
              const mood = note.mood_rating as number | null
              const start = String(note.start_time ?? '').slice(0, 5)
              const end   = String(note.end_time ?? '').slice(0, 5)
              return (
                <div key={note.id as string} className={`px-6 py-4 transition-colors ${editNote?.id === note.id ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[#111827] text-sm">{client?.legal_name ?? '—'}</span>
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-500">{String(note.visit_date)} {start}–{end}</span>
                        <span className="inline-flex items-center rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-semibold text-[#E8799E] uppercase tracking-wide">
                          {String(note.service_type ?? '').replaceAll('_', ' ')}
                        </span>
                        {mood && (
                          <span className={`text-sm ${MOOD_COLOR[mood]}`}>{MOOD_EMOJI[mood]}</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm text-gray-700 line-clamp-2">{String(note.narrative ?? '')}</p>
                      {(!!note.goals_addressed || !!note.activities) && (
                        <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-gray-400">
                          {!!note.goals_addressed && <span>Goals: {String(note.goals_addressed)}</span>}
                          {!!note.activities && <span>Activities: {String(note.activities)}</span>}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <p className="text-xs text-gray-400">{String(note.staff_name ?? '')}</p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditNote(note)}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-[10px] font-semibold text-gray-500 hover:bg-gray-50 transition"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id as string)}
                          className="rounded-lg border border-red-200 px-2.5 py-1 text-[10px] font-semibold text-red-500 hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form */}
      <ShiftNoteForm
        key={currentEdit?.id ?? 'create'}
        clients={clients}
        editNote={currentEdit}
        onCancel={handleCancel}
      />
    </div>
  )
}
