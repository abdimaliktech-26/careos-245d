import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { FormLibraryClient } from './form-library-client'

type FormDef = {
  id: string
  code: string
  name: string
  description: string | null
  packet_types: string[]
  sort_order: number
  form_fields: Array<{
    field_key: string
    label: string
    field_type: string
    is_required: boolean
    section_label: string | null
    sort_order: number
  }>
  is_active: boolean
}

export default async function FormLibraryPage() {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const supabase = await createClient()

  const { data: forms } = await supabase
    .from('form_templates')
    .select('id, code, name, description, packet_types, sort_order, is_active, form_fields(field_key, label, field_type, is_required, section_label, sort_order)')
    .eq('is_active', true)
    .order('sort_order')

  const allForms = (forms ?? []) as FormDef[]
  const role = user.role

  return <FormLibraryClient forms={allForms} role={role} />
}
