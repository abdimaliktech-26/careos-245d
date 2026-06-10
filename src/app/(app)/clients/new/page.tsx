'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/ui/form-field'
import { Button } from '@/components/ui/button'
import { createClientRecord } from '@/lib/clients/actions'
import type { CreateClientInput } from '@/lib/clients/schemas'

const PROGRAM_OPTIONS = ['ICS', 'ICLS', 'IHS', 'Employment Services', 'Day Services', 'Residential', 'Other'] as const

export default function NewClientPage() {
  const router = useRouter()
  const [errors, setErrors] = useState<Partial<Record<keyof CreateClientInput, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setServerError(null)
    setErrors({})

    const form = new FormData(e.currentTarget)
    const input: CreateClientInput = {
      firstName: form.get('firstName') as string,
      lastName: form.get('lastName') as string,
      dateOfBirth: form.get('dateOfBirth') as string,
      phone: (form.get('phone') as string) || undefined,
      email: (form.get('email') as string) || undefined,
      address: (form.get('address') as string) || undefined,
      city: (form.get('city') as string) || undefined,
      state: (form.get('state') as string) || 'MN',
      zip: (form.get('zip') as string) || undefined,
      guardianName: (form.get('guardianName') as string) || undefined,
      guardianPhone: (form.get('guardianPhone') as string) || undefined,
      guardianEmail: (form.get('guardianEmail') as string) || undefined,
      guardianRelationship: (form.get('guardianRelationship') as string) || undefined,
      program: form.get('program') as CreateClientInput['program'],
      intakeDate: form.get('intakeDate') as string,
    }

    const result = await createClientRecord(input)

    if (result.error) {
      setServerError(result.error)
      setLoading(false)
      return
    }

    if (result.data) router.push(`/clients/${result.data.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-gray-400 uppercase mb-2">
          Service Recipients
        </p>
        <h1 className="text-3xl font-bold text-gray-900">New Client</h1>
        <p className="text-gray-500 mt-1">
          Creating a client will automatically schedule their 45-day, semi-annual, and annual review packets.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {serverError && (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
            {serverError}
          </p>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="First Name" name="firstName" required error={errors.firstName} placeholder="Jane" />
            <FormField label="Last Name" name="lastName" required error={errors.lastName} placeholder="Doe" />
          </div>
          <FormField label="Date of Birth" name="dateOfBirth" type="date" required error={errors.dateOfBirth} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone" name="phone" type="tel" placeholder="612-555-0100" />
            <FormField label="Email" name="email" type="email" placeholder="jane@example.com" error={errors.email} />
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Address</h2>
          <FormField label="Street Address" name="address" placeholder="123 Main St" />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <FormField label="City" name="city" placeholder="Minneapolis" />
            </div>
            <FormField label="State" name="state" defaultValue="MN" />
          </div>
          <FormField label="ZIP Code" name="zip" placeholder="55401" />
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Guardian / Legal Representative</h2>
          <p className="text-xs text-gray-500">Leave blank if client has no legal guardian.</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Guardian Name" name="guardianName" placeholder="John Doe" />
            <FormField label="Relationship" name="guardianRelationship" placeholder="Parent" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Guardian Phone" name="guardianPhone" type="tel" placeholder="612-555-0101" />
            <FormField label="Guardian Email" name="guardianEmail" type="email" error={errors.guardianEmail} />
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Program &amp; Intake</h2>
          <FormField
            label="Intake Date"
            name="intakeDate"
            type="date"
            required
            error={errors.intakeDate}
          />
          <div>
            <label htmlFor="program" className="block text-sm font-medium text-gray-700 mb-1">
              Program
            </label>
            <select
              id="program"
              name="program"
              required
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a program…</option>
              {PROGRAM_OPTIONS.map((program) => (
                <option key={program} value={program}>
                  {program}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create Client
          </Button>
        </div>
      </form>
    </div>
  )
}
