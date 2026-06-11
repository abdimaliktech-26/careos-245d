'use client'

import { useActionState, useState } from 'react'
import { createShiftNote, updateShiftNote } from '@/lib/notes/actions'
import { useVoiceInput, type VoiceLang } from '@/hooks/use-voice-input'
import { VoiceMicButton } from '@/components/ui/voice-mic-button'

type ClientOption = { id: string; legal_name: string }

type EditNote = {
  id: string
  client_id: string
  visit_date: string
  start_time: string
  end_time: string
  service_type: string
  mood_rating: number | null
  narrative: string
  goals_addressed: string | null
  activities: string | null
}

const SERVICE_TYPES = [
  ['pca', 'PCA – Personal Care Assistance'],
  ['cdcs', 'CDCS – Consumer-Directed Community Supports'],
  ['ics', 'ICS – Individualized Community Supports'],
  ['day_services', 'Day Services'],
  ['respite', 'Respite'],
  ['transportation', 'Transportation'],
  ['hcbs_other', 'HCBS – Other'],
]

const MOOD_LABELS: Record<string, string> = {
  '1': '1 – Distressed',
  '2': '2 – Upset',
  '3': '3 – Neutral',
  '4': '4 – Good',
  '5': '5 – Excellent',
}

const labelClass = 'text-xs font-semibold uppercase tracking-widest text-muted-foreground'
const inputClass = 'care-input mt-1 w-full rounded-xl border px-3 py-2.5 text-sm'

export function ShiftNoteForm({ clients, editNote, onCancel }: { clients: ClientOption[]; editNote?: EditNote | null; onCancel?: () => void }) {
  const [state, action, isPending] = useActionState(
    (editNote ? updateShiftNote : createShiftNote) as (
      state: { error: string | null; success: string | null },
      payload: FormData
    ) => Promise<{ error: string | null; success: string | null }>,
    { error: null, success: null }
  )
  const [narrative, setNarrative] = useState(editNote?.narrative ?? '')
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('en')
  const [voiceError, setVoiceError] = useState<string | null>(null)

  const { isListening, isSupported, toggle: toggleMic } = useVoiceInput({
    lang: voiceLang,
    onResult: (transcript, isFinal) => {
      if (!isFinal) return
      setNarrative((prev) => prev ? `${prev} ${transcript}` : transcript)
      setVoiceError(null)
    },
    onError: (msg) => setVoiceError(msg),
  })

  const isEditing = !!editNote

  return (
    <form action={action} className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
      {isEditing && <input type="hidden" name="noteId" value={editNote.id} />}

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
          {isEditing ? 'Edit Entry' : 'New Entry'}
        </p>
        <h2 className="mt-1 text-xl font-black text-foreground">
          {isEditing ? 'Update Shift Note' : 'Log Shift Note'}
        </h2>
      </div>

      {state.error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {!!state.success && (
        <p className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
          {isEditing && (
            <button type="button" onClick={onCancel} className="ml-2 underline text-green-800">Continue</button>
          )}
        </p>
      )}

      <label className="block">
        <span className={labelClass}>Client</span>
        <select name="clientId" required className={inputClass} defaultValue={editNote?.client_id ?? ''}>
          <option value="">Select client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.legal_name}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Visit Date</span>
        <input name="visitDate" type="date" required className={inputClass}
          defaultValue={editNote?.visit_date ?? new Date().toISOString().slice(0, 10)} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>Start Time</span>
          <input name="startTime" type="time" required className={inputClass}
            defaultValue={editNote?.start_time ?? ''} />
        </label>
        <label className="block">
          <span className={labelClass}>End Time</span>
          <input name="endTime" type="time" required className={inputClass}
            defaultValue={editNote?.end_time ?? ''} />
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Service Type</span>
        <select name="serviceType" required className={inputClass}
          defaultValue={editNote?.service_type ?? 'pca'}>
          {SERVICE_TYPES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Client Mood / Behavior</span>
        <select name="moodRating" className={inputClass}
          defaultValue={editNote?.mood_rating ? String(editNote.mood_rating) : ''}>
          <option value="">Not recorded</option>
          {Object.entries(MOOD_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </label>

      {/* Narrative with voice dictation */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className={labelClass}>
            Shift Narrative <span className="text-red-400">*</span>
          </span>
          <div className="flex items-center gap-2">
            {isSupported && (
              <div className="flex overflow-hidden rounded-full border border-border text-[10px] font-bold">
                {(['en', 'so'] as VoiceLang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setVoiceLang(l)}
                    className={`px-2 py-0.5 transition ${
                      voiceLang === l ? 'bg-primary text-white' : 'text-muted-foreground hover:text-muted-foreground'
                    }`}
                  >
                    {l === 'en' ? 'EN' : 'SO'}
                  </button>
                ))}
              </div>
            )}
            <VoiceMicButton
              isListening={isListening}
              isSupported={isSupported}
              lang={voiceLang}
              onClick={toggleMic}
              size="sm"
              disabled={isPending}
            />
          </div>
        </div>

        <textarea
          name="narrative"
          required
          rows={5}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder={
            isListening
              ? (voiceLang === 'so' ? 'Dhageysanaya — hadal hadda…' : 'Listening — speak now…')
              : 'Describe the visit: what was done, how the client responded, any concerns…'
          }
          className={`${inputClass} resize-none transition ${
            isListening ? 'border-red-300 ring-2 ring-red-100' : ''
          }`}
        />

        {voiceError && (
          <p className="mt-1 flex items-center justify-between rounded-lg bg-orange-50 px-3 py-1.5 text-xs text-orange-700">
            {voiceError}
            <button
              type="button"
              onClick={() => setVoiceError(null)}
              className="ml-2 text-orange-400 hover:text-orange-600"
            >
              ✕
            </button>
          </p>
        )}
      </div>

      <label className="block">
        <span className={labelClass}>Goals Addressed</span>
        <input name="goalsAddressed" className={inputClass}
          placeholder="e.g. Community integration, communication skills"
          defaultValue={editNote?.goals_addressed ?? ''} />
      </label>

      <label className="block">
        <span className={labelClass}>Activities</span>
        <input name="activities" className={inputClass}
          placeholder="e.g. Cooking, grocery shopping, medication reminder"
          defaultValue={editNote?.activities ?? ''} />
      </label>

      <div className="flex gap-3">
        {isEditing && (
          <>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--gradient-primary)' }}
            >
              {isPending ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:bg-muted/40 transition"
            >
              Cancel
            </button>
          </>
        )}
        {!isEditing && (
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--gradient-primary)' }}
          >
            {isPending ? 'Saving…' : 'Save Shift Note'}
          </button>
        )}
      </div>
    </form>
  )
}
