import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { FormBuilder } from '@/components/forms/builder/form-builder'

export default async function NewFormTemplatePage() {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase mb-2">Admin</p>
        <h1 className="text-3xl font-bold text-foreground">New Form Template</h1>
        <p className="text-muted-foreground mt-1">Design a custom form template by adding and configuring fields.</p>
      </div>
      <FormBuilder
        initial={{
          id: null,
          code: '',
          name: '',
          description: '',
          packetTypes: [],
          organizationId: user.organizationId,
          fields: [],
        }}
      />
    </div>
  )
}
