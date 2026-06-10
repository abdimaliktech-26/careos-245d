'use client'

import { useActionState } from 'react'
import { uploadDocument } from '@/lib/document-vault/actions'

type Option = { id: string; label: string }

const CATEGORIES = [
  ['cssp', 'CSSP'],
  ['cssp_addendum', 'CSSP Addendum'],
  ['assessment', 'Assessment'],
  ['service_agreement', 'Service Agreement'],
  ['medical', 'Medical'],
  ['guardian', 'Guardian'],
  ['county', 'County'],
  ['background_study', 'Background Study'],
  ['training_certificate', 'Training Certificate'],
  ['incident_attachment', 'Incident Attachment'],
  ['other', 'Other'],
]

export function DocumentUploadForm({ clients, staff }: { clients: Option[]; staff: Option[] }) {
  const [state, action, isPending] = useActionState(
    uploadDocument as (state: { error: string | null; success: string | null }, payload: FormData) => Promise<{ error: string | null; success: string | null }>,
    { error: null, success: null }
  )

  return (
    <form action={action} className="care-panel rounded-2xl p-6 space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B4B2D]">Vault Upload</p>
        <h2 className="mt-1 text-xl font-black text-[#24343a]">Add Document</h2>
      </div>
      {state.error && <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state.success && <p className="rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">{state.success}</p>}

      <input name="displayName" required className="care-input w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Document name" />
      <select name="category" required className="care-input w-full rounded-xl border px-3 py-2.5 text-sm">
        {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      <select name="clientId" className="care-input w-full rounded-xl border px-3 py-2.5 text-sm">
        <option value="">No client attachment</option>
        {clients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
      </select>
      <select name="staffId" className="care-input w-full rounded-xl border px-3 py-2.5 text-sm">
        <option value="">No staff attachment</option>
        {staff.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
      </select>
      <textarea name="description" rows={3} className="care-input w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Description" />
      <input name="file" type="file" required className="block w-full text-sm text-[#667085] file:mr-4 file:rounded-full file:border-0 file:bg-[#24343a] file:px-4 file:py-2 file:text-sm file:font-bold file:text-white" />
      <button type="submit" disabled={isPending} className="w-full rounded-full bg-[#f37d6d] px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
        {isPending ? 'Uploading...' : 'Upload Document'}
      </button>
    </form>
  )
}
