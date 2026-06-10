import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const sql = readFileSync(resolve(__dirname, '../supabase/migrations/202606090001_org_billing_fields.sql'), 'utf8')

const resp = await fetch(`${supabaseUrl}/sql`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify({ query: sql }),
})

const text = await resp.text()
console.log(`Status: ${resp.status}`)
console.log(text)
