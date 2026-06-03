'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FormField } from '@/components/ui/form-field'
import { Button } from '@/components/ui/button'
import { createStaffAccount } from '@/lib/staff-admin/actions'

export default function NewStaffPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setServerError(null)

    const form = new FormData(e.currentTarget)
    const result = await createStaffAccount({
      firstName: form.get('firstName') as string,
      lastName: form.get('lastName') as string,
      email: form.get('email') as string,
      phone: (form.get('phone') as string) || undefined,
    })

    if (result.error) {
      setServerError(result.error)
      setLoading(false)
      return
    }

    router.push('/admin/staff')
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Staff Member</h1>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-200 rounded-lg p-6">
        {serverError && (
          <p className="text-red-600 bg-red-50 border border-red-200 rounded p-3 text-sm">{serverError}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField label="First Name" name="firstName" required placeholder="Alex" />
          <FormField label="Last Name" name="lastName" required placeholder="Johnson" />
        </div>
        <FormField label="Email" name="email" type="email" required placeholder="alex@yourorg.com" />
        <FormField label="Phone" name="phone" type="tel" placeholder="612-555-0100" />

        <p className="text-xs text-gray-400">A temporary password is set. Staff should change it on first login.</p>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Staff Account</Button>
        </div>
      </form>
    </div>
  )
}
