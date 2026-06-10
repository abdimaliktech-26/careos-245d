'use server'

import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function importCsv(table: string, rows: Record<string, string>[]) {
  const { user } = await getSession()
  if (!user?.organizationId || !['org_admin', 'super_admin'].includes(user.role)) {
    return { count: 0, error: 'Unauthorized' }
  }

  const supabase = await createClient()
  let count = 0

  for (const row of rows) {
    const { error } = await supabase.from(table).insert({
      organization_id: user.organizationId,
      ...row,
    })
    if (!error) count++
  }

  revalidatePath(`/${table}`)
  return { count, error: null }
}

export async function exportCsv(table: string, columns: string[]): Promise<{ csv: string; error: string | null }> {
  const { user } = await getSession()
  if (!user?.organizationId) return { csv: '', error: 'Unauthorized' }

  const supabase = await createClient()
  const { data } = await supabase
    .from(table)
    .select(columns.join(','))
    .eq('organization_id', user.organizationId)
    .is('deleted_at', null)

  if (!data || data.length === 0) return { csv: '', error: null }

  const header = columns.join(',')
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = (row as unknown as Record<string, unknown>)[c]
      if (val === null || val === undefined) return ''
      return `"${String(val).replace(/"/g, '""')}"`
    }).join(',')
  )

  return { csv: [header, ...rows].join('\n'), error: null }
}
