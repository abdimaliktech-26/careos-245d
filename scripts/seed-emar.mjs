/**
 * Seed eMAR + Pharmacy demo data:
 *   one pharmacy, one pharmacy admin login, an approved provider link,
 *   two client assignments, and sample medications + schedules.
 *
 * Run: node --env-file=.env.local scripts/seed-emar.mjs
 * Idempotent-ish: re-running creates fresh medications but reuses the pharmacy,
 * link, pharmacy user, and client assignments by natural keys.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PHARM_EMAIL = process.env.DEMO_PHARMACY_EMAIL ?? 'pharmacy@higsi.app'
const PHARM_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'

if (!URL || !KEY) { console.error('Missing Supabase env'); process.exit(1) }
const db = createClient(URL, KEY, { auth: { persistSession: false } })

async function main() {
  // 1. Resolve the demo organization (first org).
  const { data: org } = await db.from('organizations').select('id, name').order('created_at').limit(1).single()
  if (!org) { console.error('No organization found — seed the base app first.'); process.exit(1) }
  console.log('Org:', org.name, org.id)

  // 2. Ensure two clients exist.
  let { data: clients } = await db.from('clients').select('id, legal_name').eq('organization_id', org.id).limit(2)
  clients = clients ?? []
  const samples = [
    { legal_name: 'Aaliyah Hassan', date_of_birth: '1991-04-12', program: 'ICS' },
    { legal_name: 'Marcus Johnson', date_of_birth: '1985-09-30', program: 'ICLS' },
  ]
  for (let i = clients.length; i < 2; i++) {
    const { data: c } = await db.from('clients').insert({ organization_id: org.id, ...samples[i] }).select('id, legal_name').single()
    if (c) clients.push(c)
  }
  console.log('Clients:', clients.map((c) => c.legal_name).join(', '))

  // 3. Pharmacy (reuse by name).
  let { data: pharmacy } = await db.from('pharmacies').select('id').eq('name', 'Higsi Demo Pharmacy').maybeSingle()
  if (!pharmacy) {
    const { data } = await db.from('pharmacies').insert({ name: 'Higsi Demo Pharmacy', email: PHARM_EMAIL, contact_name: 'Demo Pharmacist', phone: '612-555-0199' }).select('id').single()
    pharmacy = data
  }
  console.log('Pharmacy:', pharmacy.id)

  // 4. Approved provider link.
  await db.from('provider_pharmacy_links').upsert(
    { organization_id: org.id, pharmacy_id: pharmacy.id, status: 'approved', approved_at: new Date().toISOString() },
    { onConflict: 'organization_id,pharmacy_id' }
  )

  // 5. Pharmacy admin login.
  const { data: list } = await db.auth.admin.listUsers()
  let pharmUser = list?.users?.find((u) => u.email === PHARM_EMAIL)
  if (!pharmUser) {
    const { data } = await db.auth.admin.createUser({ email: PHARM_EMAIL, password: PHARM_PASSWORD, email_confirm: true, user_metadata: { full_name: 'Demo Pharmacist' } })
    pharmUser = data.user
  }
  await db.from('pharmacy_users').upsert(
    { pharmacy_id: pharmacy.id, user_id: pharmUser.id, role: 'pharmacy_admin', full_name: 'Demo Pharmacist', email: PHARM_EMAIL, is_active: true },
    { onConflict: 'pharmacy_id,user_id' }
  )
  console.log('Pharmacy user:', PHARM_EMAIL, '/', PHARM_PASSWORD)

  // 6. Client assignments.
  for (const c of clients) {
    await db.from('client_pharmacy_assignments').upsert(
      { organization_id: org.id, client_id: c.id, pharmacy_id: pharmacy.id, is_primary: true },
      { onConflict: 'client_id,pharmacy_id' }
    )
  }

  // 7. Sample medications + schedules.
  const meds = [
    { name: 'Lisinopril', generic_name: 'Lisinopril', dosage: '10 mg', route: 'Oral', frequency: 'Once daily', administration_times: ['08:00'], prescribing_physician: 'Dr. Patel', is_controlled: false },
    { name: 'Metformin', generic_name: 'Metformin HCl', dosage: '500 mg', route: 'Oral', frequency: 'Twice daily', administration_times: ['08:00', '20:00'], prescribing_physician: 'Dr. Patel', is_controlled: false },
    { name: 'Lorazepam', generic_name: 'Lorazepam', dosage: '0.5 mg', route: 'Oral', frequency: 'PRN anxiety', administration_times: [], is_prn: true, prescribing_physician: 'Dr. Reed', is_controlled: true },
  ]
  let medCount = 0
  for (const c of clients) {
    for (const m of meds) {
      const { data: med } = await db.from('medications').insert({
        organization_id: org.id, client_id: c.id, pharmacy_id: pharmacy.id, status: 'active', ...m,
      }).select('id').single()
      if (med && !m.is_prn) {
        await db.from('medication_schedules').insert(
          m.administration_times.map((t) => ({ organization_id: org.id, client_id: c.id, medication_id: med.id, time_of_day: t, is_prn: false, active: true }))
        )
      }
      if (med) medCount++
    }
  }
  console.log(`Seeded ${medCount} medications across ${clients.length} clients.`)
  console.log('Done.')
}

main().catch((e) => { console.error(e); process.exit(1) })
