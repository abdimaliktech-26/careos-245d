'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/ui/form-field'
import { Button } from '@/components/ui/button'
import { createStaffAccount } from '@/lib/staff-admin/actions'

type OrganizationOption = {
  id: string
  name: string
}

type CreatedStaff = {
  email: string
  temporaryPassword: string
}

export function NewStaffForm({
  isSuperAdmin,
  organizations,
}: {
  isSuperAdmin: boolean
  organizations: OrganizationOption[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [createdStaff, setCreatedStaff] = useState<CreatedStaff | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formElement = e.currentTarget
    setLoading(true)
    setServerError(null)
    setCreatedStaff(null)

    const form = new FormData(formElement)
    const result = await createStaffAccount({
      firstName: form.get('firstName') as string,
      lastName: form.get('lastName') as string,
      email: form.get('email') as string,
      phone: (form.get('phone') as string) || undefined,
      organizationId: (form.get('organizationId') as string) || undefined,
    })

    if (result.error) {
      setServerError(result.error)
      setLoading(false)
      return
    }
    if (!result.data) {
      setServerError('Staff account was created, but credentials could not be returned.')
      setLoading(false)
      return
    }

    setCreatedStaff({
      email: result.data.email,
      temporaryPassword: result.data.temporaryPassword,
    })
    formElement.reset()
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-lg p-6">
      {serverError && (
        <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3 text-sm">{serverError}</p>
      )}

      {createdStaff && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm">
          <p className="font-semibold text-green-900">Staff account created</p>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-green-700">Email</dt>
              <dd className="font-mono text-green-950 break-all">{createdStaff.email}</dd>
            </div>
            <div>
              <dt className="text-green-700">Temporary password</dt>
              <dd className="font-mono text-green-950 break-all">{createdStaff.temporaryPassword}</dd>
            </div>
          </dl>
          <p className="text-green-800 mt-3">
            Share these credentials securely. Staff should change the password after first login.
          </p>
        </div>
      )}

      {isSuperAdmin && (
        <div>
          <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-1">
            Business Organization <span className="text-red-500">*</span>
          </label>
          <select
            id="organizationId"
            name="organizationId"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            <option value="">Choose organization</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <FormField label="First Name" name="firstName" required placeholder="Alex" />
        <FormField label="Last Name" name="lastName" required placeholder="Johnson" />
      </div>
      <FormField label="Email" name="email" type="email" required placeholder="alex@yourorg.com" />
      <FormField label="Phone" name="phone" type="tel" placeholder="612-555-0100" />

      <p className="text-xs text-gray-500">
        Staff can access clients, packets, and the full Intake, 45-Day, Semi-Annual, and Annual form sets for their organization.
      </p>

      <div className="flex gap-3 justify-end pt-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        {createdStaff && (
          <Button type="button" variant="secondary" onClick={() => router.push('/admin/staff')}>
            View Staff
          </Button>
        )}
        <Button type="submit" loading={loading}>Create Staff Account</Button>
      </div>
    </form>
  )
}
