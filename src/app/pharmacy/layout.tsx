import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { isPharmacy } from '@/lib/auth/role-guards'
import { PharmacySidebar } from '@/components/pharmacy/pharmacy-sidebar'

export default async function PharmacyLayout({ children }: { children: React.ReactNode }) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')
  if (!isPharmacy(user.role)) redirect('/dashboard')

  let pharmacyName = 'Pharmacy'
  if (user.pharmacyId) {
    const supabase = await createServerClient()
    const { data } = await supabase.from('pharmacies').select('name').eq('id', user.pharmacyId).maybeSingle()
    if (data?.name) pharmacyName = data.name
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PharmacySidebar pharmacyName={pharmacyName} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
