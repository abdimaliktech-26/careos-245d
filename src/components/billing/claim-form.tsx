'use client'

import { useActionState } from 'react'
import { createClaim, updateClaim } from '@/lib/billing/actions'

const COMMON_CPT_CODES = [
  'T1019', 'T1020', 'T2025', 'H2015', 'H2016', 'H2021', 'H2022',
  'H2023', 'H2032', 'H2033', 'S5125', 'S5126', 'S5130', 'S5131',
  'S5135', 'S5136', 'S5140', 'S5141', 'S5145', 'S5146', 'S5150',
  'S5151', 'S5160', 'S5161', 'S5165', 'S5170', 'S5175', 'S5190',
  'S5199', '99201', '99202', '99203', '99204', '99205',
  '99211', '99212', '99213', '99214', '99215',
  '99221', '99222', '99223', '99231', '99232', '99233',
  '99304', '99305', '99306', '99307', '99308', '99309', '99310',
  '99315', '99316', '99324', '99325', '99326', '99327', '99328',
  '99334', '99335', '99336', '99337', '99341', '99342', '99343',
  '99344', '99345', '99347', '99348', '99349', '99350',
  'G0151', 'G0152', 'G0153', 'G0154', 'G0155', 'G0156', 'G0157',
  'G0159', 'G0160', 'G0161', 'G0162', 'G0163',
  '97151', '97152', '97153', '97154', '97155', '97156', '97157', '97158',
]

export function ClaimForm({
  clients,
  serviceAuths,
  initialData,
  onClose,
}: {
  clients: Array<{ id: string; legal_name: string }>
  serviceAuths?: Array<{ id: string; auth_number: string; cpt_code: string; payer: string }>
  initialData?: Record<string, unknown> | null
  onClose?: () => void
}) {
  const isEdit = !!initialData

  const [state, action, isPending] = useActionState(
    async (prev: { error: string | null; success: boolean }, formData: FormData) => {
      if (isEdit && initialData?.id) {
        return updateClaim(initialData.id as string, formData)
      }
      return createClaim(prev, formData)
    },
    { error: null, success: false }
  )

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8799E]">
          {isEdit ? 'Edit Claim' : 'New Claim'}
        </p>
        {isEdit && onClose && (
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        )}
      </div>

      {state.error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{state.error}</p>}
      {state.success && !isEdit && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">Claim created.</p>}
      {state.success && isEdit && <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">Claim updated.</p>}

      <form action={action} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600">Client</label>
          <select name="clientId" required defaultValue={initialData?.client_id as string ?? ''} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Select...</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Payer</label>
            <input name="payer" required defaultValue={initialData?.payer as string ?? ''} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Minnesota DHS" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Auth #</label>
            {serviceAuths && serviceAuths.length > 0 ? (
              <select name="authNumber" defaultValue={initialData?.auth_number as string ?? ''} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
                <option value="">None</option>
                {serviceAuths.map((a) => (
                  <option key={a.id} value={a.auth_number}>
                    {a.auth_number} — {a.payer} ({a.cpt_code})
                  </option>
                ))}
              </select>
            ) : (
              <input name="authNumber" defaultValue={initialData?.auth_number as string ?? ''} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Auth number" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">CPT/HCPCS</label>
            <input
              name="cptCode"
              required
              defaultValue={initialData?.cpt_code as string ?? ''}
              list="cpt-codes"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="T1019"
            />
            <datalist id="cpt-codes">
              {COMMON_CPT_CODES.map((code) => <option key={code} value={code} />)}
            </datalist>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Mod</label>
            <input name="modifier" defaultValue={initialData?.modifier as string ?? ''} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="U4" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Rate</label>
            <input name="rate" type="number" step="0.01" defaultValue={initialData?.rate as string ?? ''} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Amount</label>
            <input name="amount" type="number" step="0.01" defaultValue={initialData?.amount as string ?? ''} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">Service Date</label>
          <input name="serviceDate" type="date" required defaultValue={initialData?.service_date as string ?? ''} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">Notes</label>
          <textarea name="notes" rows={2} defaultValue={initialData?.notes as string ?? ''} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none" />
        </div>

        <button type="submit" disabled={isPending} className="w-full rounded-lg bg-[#E8799E] py-2.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40">
          {isPending ? 'Saving...' : isEdit ? 'Update Claim' : 'Create Claim'}
        </button>
      </form>
    </div>
  )
}
