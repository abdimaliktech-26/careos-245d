'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { revalidatePath } from 'next/cache'

type PlatformSettings = Record<string, string>

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const admin = createAdminClient()
  const { data } = await admin.from('platform_settings').select('key, value')

  const settings: PlatformSettings = {}
  for (const row of (data ?? [])) {
    settings[row.key] = row.value
  }
  return settings
}

export async function savePlatformSetting(key: string, value: string): Promise<{ error: string | null }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'super_admin') {
    return { error: 'Unauthorized' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() })

  if (error) return { error: error.message }
  revalidatePath('/super-admin/settings')
  return { error: null }
}

export async function savePlatformSettings(
  settings: Record<string, string>
): Promise<{ error: string | null }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || user.role !== 'super_admin') {
    return { error: 'Unauthorized' }
  }

  const admin = createAdminClient()
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await admin.from('platform_settings').upsert(rows)

  if (error) return { error: error.message }
  revalidatePath('/super-admin/settings')
  return { error: null }
}
