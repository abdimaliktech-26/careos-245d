#!/usr/bin/env node
/**
 * Demo seed script — creates a demo organization with one org_admin user
 * and three sample clients. Re-runnable: deletes existing demo org first.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/seed-demo.mjs
 *
 * Optional:
 *   DEMO_EMAIL=demo@careintake.app  (default)
 *   DEMO_PASSWORD=Demo2026!         (default)
 *   DEMO_ORG_NAME='Demo Organization' (default)
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'demo@careintake.app'
const DEMO_SUPER_EMAIL = process.env.DEMO_SUPER_EMAIL ?? 'superadmin@careintake.app'
const DEMO_STAFF_EMAIL = process.env.DEMO_STAFF_EMAIL ?? 'staff@careintake.app'
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'Demo2026!'
const DEMO_ORG_NAME = process.env.DEMO_ORG_NAME ?? 'Demo Organization'

const DEMO_EMAILS = [DEMO_EMAIL, DEMO_SUPER_EMAIL, DEMO_STAFF_EMAIL]

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function deleteExistingDemo() {
  const { data: orgs } = await admin
    .from('organizations')
    .select('id')
    .eq('name', DEMO_ORG_NAME)

  for (const org of orgs ?? []) {
    await admin.from('organizations').delete().eq('id', org.id)
  }

  const targets = DEMO_EMAILS.map((e) => e.toLowerCase())
  let page = 1

  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    const users = data?.users ?? []
    for (const u of users) {
      if (u.email && targets.includes(u.email.toLowerCase())) {
        await admin.auth.admin.deleteUser(u.id)
      }
    }
    if (users.length < 200) break
    page += 1
  }
}

async function createOrg() {
  const { data, error } = await admin
    .from('organizations')
    .insert({
      name: DEMO_ORG_NAME,
      email: DEMO_EMAIL,
      city: 'Minneapolis',
      state: 'MN',
      zip: '55401',
      phone: '612-555-0100',
      plan: 'pro',
      status: 'active',
    })
    .select('id')
    .single()

  if (error) throw new Error(`org create failed: ${error.message}`)
  return data.id
}

async function createMember(orgId, { email, role, fullName }) {
  // NOTE: do not put role in user_metadata — a DB trigger on auth.users
  // chokes on it. Role lives on organization_members instead.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { organization_id: orgId },
  })
  if (error) throw new Error(`user create failed (${email}): ${error.message}`)

  const { error: memberError } = await admin
    .from('organization_members')
    .insert({
      organization_id: orgId,
      user_id: data.user.id,
      role,
      full_name: fullName,
      email,
      is_active: true,
      joined_at: new Date().toISOString(),
    })
  if (memberError) throw new Error(`member create failed (${email}): ${memberError.message}`)
  return data.user.id
}

async function createClients(orgId) {
  const clients = [
    {
      organization_id: orgId,
      legal_name: 'Aaliyah Hassan',
      preferred_name: 'Aaliyah',
      date_of_birth: '1992-03-14',
      gender: 'female',
      primary_language: 'Somali',
      program: 'ICS',
      waiver_type: 'CADI',
      county_of_service: 'Hennepin',
      city: 'Minneapolis',
      state: 'MN',
      zip: '55404',
      service_start_date: '2025-01-15',
      guardianship_status: 'self',
    },
    {
      organization_id: orgId,
      legal_name: 'Marcus Johnson',
      preferred_name: 'Marcus',
      date_of_birth: '1985-07-22',
      gender: 'male',
      primary_language: 'English',
      program: 'ICLS',
      waiver_type: 'DD',
      county_of_service: 'Ramsey',
      city: 'Saint Paul',
      state: 'MN',
      zip: '55102',
      service_start_date: '2024-11-01',
      guardianship_status: 'self',
    },
    {
      organization_id: orgId,
      legal_name: 'Sofia Ramirez',
      preferred_name: 'Sofia',
      date_of_birth: '2001-12-05',
      gender: 'female',
      primary_language: 'Spanish',
      program: 'Day Services',
      waiver_type: 'BI',
      county_of_service: 'Dakota',
      city: 'Eagan',
      state: 'MN',
      zip: '55121',
      service_start_date: '2025-03-10',
      guardianship_status: 'full_guardian',
      guardian_name: 'Maria Ramirez',
      guardian_phone: '651-555-0188',
      guardian_relationship: 'mother',
    },
  ]

  const { error } = await admin.from('clients').insert(clients)
  if (error) throw new Error(`clients create failed: ${error.message}`)
}

async function main() {
  console.log(`Resetting any existing demo org "${DEMO_ORG_NAME}"…`)
  await deleteExistingDemo()

  console.log('Creating org…')
  const orgId = await createOrg()
  console.log(`  org_id = ${orgId}`)

  console.log('Creating org_admin user…')
  const adminId = await createMember(orgId, {
    email: DEMO_EMAIL, role: 'org_admin', fullName: 'Demo Admin',
  })
  console.log(`  user_id = ${adminId}`)

  console.log('Creating super_admin user…')
  const superId = await createMember(orgId, {
    email: DEMO_SUPER_EMAIL, role: 'super_admin', fullName: 'Demo Super Admin',
  })
  console.log(`  user_id = ${superId}`)

  console.log('Creating staff user…')
  const staffId = await createMember(orgId, {
    email: DEMO_STAFF_EMAIL, role: 'staff', fullName: 'Demo Staff',
  })
  console.log(`  user_id = ${staffId}`)

  console.log('Creating sample clients…')
  await createClients(orgId)

  console.log('')
  console.log('Demo accounts ready (password for all: ' + DEMO_PASSWORD + '):')
  console.log(`  org_admin:   ${DEMO_EMAIL}`)
  console.log(`  super_admin: ${DEMO_SUPER_EMAIL}`)
  console.log(`  staff:       ${DEMO_STAFF_EMAIL}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
