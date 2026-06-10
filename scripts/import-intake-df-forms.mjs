import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const ROOT = '/Users/abdimalik/Desktop/Intake DF'

const PACKET_DIRS = [
  { dir: 'Intake forms', packetType: 'intake', codePrefix: 'INTAKE', prefix: /^INTAKE-\s*/i },
  { dir: '45 Day Review forms', packetType: '45_day_review', codePrefix: '45DAY', prefix: /^45 Day Forms-\s*/i },
  { dir: 'Semi Annual Forms ', packetType: 'semi_annual_review', codePrefix: 'SEMIANNUAL', prefix: /^SEMI ANNUAL-\s*/i },
  { dir: 'Annual Forms ', packetType: 'annual_review', codePrefix: 'ANNUAL', prefix: /^ANNUAL-\s*/i },
]

const RESERVED_CODES = new Set([
  '245D-INTAKE-01',
  '245D-SA-02',
  '245D-CSSP-03',
  '245D-HEALTH-04',
  '245D-EMRG-05',
  '245D-RIGHTS-06',
  '245D-REV-45',
  '245D-REV-SEMI',
  '245D-REV-ANN',
])

const IMPORT_PREFIXES = ['INTAKE-', '45DAY-', 'SEMIANNUAL-', 'ANNUAL-']

function loadEnv() {
  return Object.fromEntries(
    fs.readFileSync('.env.local', 'utf8')
      .split(/\n/)
      .filter((line) => line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index), line.slice(index + 1)]
      })
  )
}

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\bDpf\b/g, 'DPF')
    .replace(/\bDhf\b/g, 'DHF')
    .replace(/\bDhs\b/g, 'DHS')
}

function slug(value) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48)

  return base || 'field'
}

function parseFileName(fileName, prefix) {
  const raw = fileName.replace(/\.pdf$/i, '').replace(prefix, '').trim()
  const [left, ...rest] = raw.split('--')
  const explicitTitle = rest.join('--').trim()
  const leftClean = left.trim()
  const codeMatch = leftClean.match(/(?:DPF|DHF)-?\s*\d+[A-Z]?|DHS\s*\d+|245D/i)

  let code = codeMatch?.[0]?.toUpperCase().replace(/\s+/g, '-')
  let title = explicitTitle || leftClean

  if (!code && /abuse prevention/i.test(raw)) code = '245D-IAPP'
  if (code === '245D') code = '245D-IAPP'
  if (!code && /residency agreement/i.test(raw)) code = 'DHS-7176'
  if (!code) code = slug(raw).toUpperCase()

  title = title
    .replace(/^(DPF|DHF)-?\s*\d+[A-Z]?\s*/i, '')
    .replace(/^DHS\s*\d+\s*/i, '')
    .trim()

  if (!title || title === code) title = raw.replace(code, '').trim()
  return { code, name: titleCase(title || raw) }
}

function pdfText(pdfPath) {
  return execFileSync('pdftotext', ['-layout', pdfPath, '-'], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  })
}

function isFooter(line) {
  return (
    /^©/.test(line) ||
    /All rights reserved/i.test(line) ||
    /\bNew \d+\/\d+\b/i.test(line) ||
    /\bRev\.?\s*\d+\/\d+\b/i.test(line) ||
    /^DPF-\d+/i.test(line) ||
    /^DHF-\d+/i.test(line) ||
    /^\d+$/.test(line.trim())
  )
}

function isSection(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.includes(':') || trimmed.includes('?') || trimmed.includes('☐')) return false
  if (trimmed.length > 80) return false
  if (/^(Name|Date|Address|Phone|Email)\b/i.test(trimmed)) return false
  const letters = trimmed.replace(/[^A-Za-z]/g, '')
  if (letters.length < 5) return false
  return trimmed === trimmed.toUpperCase()
}

function fieldTypeFor(label, sourceLine) {
  const value = `${label} ${sourceLine}`.toLowerCase()
  if (sourceLine.includes('☐') && /\byes\b/i.test(sourceLine) && /\bno\b/i.test(sourceLine)) return 'radio'
  if (sourceLine.includes('☐')) return 'checkbox'
  if (/\bemail\b/.test(value)) return 'email'
  if (/\b(phone|telephone|cell)\b/.test(value)) return 'phone'
  if (/\bdate\b|birth|annual period from|\bto:\s*$/.test(value)) return 'date'
  if (/\bsignature\b|signed by|person served and\/or legal representative/.test(value)) return 'signature'
  if (
    label.length > 70 ||
    /^(describe|provide|explain|what|how|if yes|if no|summary|notes|recommendations|progress|outcome|concerns|actions?)/i.test(label)
  ) {
    return 'textarea'
  }
  return 'text'
}

function normalizeLabel(label) {
  return label
    .replace(/Click or tap (here )?to enter (text|a date)\.?/gi, '')
    .replace(/[☐_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+:/g, ':')
    .replace(/[:.]\s*$/g, '')
    .trim()
}

function addField(fields, seen, section, rawLabel, sourceLine) {
  const label = normalizeLabel(rawLabel)
  if (!label || label.length < 3) return
  if (/^(yes|no|n\/a|other)$|all rights reserved|duplicate with permission|click or tap/i.test(label)) return

  let key = slug(label)
  let suffix = 2
  while (seen.has(key)) key = `${slug(label)}_${suffix++}`
  seen.add(key)

  const fieldType = fieldTypeFor(label, sourceLine)
  fields.push({
    section_label: section,
    field_key: key,
    label,
    field_type: fieldType,
    is_required: false,
    options: fieldType === 'radio'
      ? [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]
      : null,
  })
}

function extractFields(text) {
  const fields = []
  const seen = new Set()
  let section = 'General'
  const lines = text
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && !isFooter(line))

  for (const line of lines) {
    if (isSection(line)) {
      section = titleCase(line)
      continue
    }

    if (line.includes('☐')) {
      const label = line.split('☐')[0].trim() || line.replace(/☐/g, '').trim()
      addField(fields, seen, section, label, line)
      continue
    }

    const clickIndex = line.search(/Click or tap/i)
    if (clickIndex > 0) {
      const before = line.slice(0, clickIndex).trim()
      addField(fields, seen, section, before, line)
      continue
    }

    const colonMatches = [...line.matchAll(/([^:]{2,80}):/g)]
    if (colonMatches.length > 0) {
      for (const match of colonMatches) {
        const candidate = match[1]
          .split(/\s{2,}/)
          .at(-1)
        addField(fields, seen, section, candidate ?? match[1], line)
      }
    }
  }

  return fields.map((field, index) => ({ ...field, sort_order: (index + 1) * 10 }))
}

function discoverForms() {
  const forms = []

  for (const { dir, packetType, codePrefix, prefix } of PACKET_DIRS) {
    const fullDir = path.join(ROOT, dir)
    for (const fileName of fs.readdirSync(fullDir).filter((name) => name.toLowerCase().endsWith('.pdf')).sort()) {
      const pdfPath = path.join(fullDir, fileName)
      const parsed = parseFileName(fileName, prefix)
      const text = pdfText(pdfPath)
      const fields = extractFields(text)
      const code = `${codePrefix}-${parsed.code}`

      forms.push({
        code,
        name: parsed.name,
        description: `Imported from ${fileName}`,
        packet_types: [packetType],
        fields,
        source_files: [pdfPath],
      })
    }
  }

  return forms.sort((a, b) => a.code.localeCompare(b.code))
}

async function main() {
  const env = loadEnv()
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const forms = discoverForms()

  const { data: allTemplates, error: allTemplatesError } = await supabase
    .from('form_templates')
    .select('id, code')
  if (allTemplatesError) throw allTemplatesError

  const genericTemplateIds = (allTemplates ?? [])
    .filter((template) => RESERVED_CODES.has(template.code))
    .map((template) => template.id)

  if (genericTemplateIds.length > 0) {
    const { error } = await supabase
      .from('form_templates')
      .update({ is_active: false })
      .in('id', genericTemplateIds)
    if (error) throw error
  }

  const oldImportedTemplateIds = (allTemplates ?? [])
    .filter((template) =>
      IMPORT_PREFIXES.some((prefix) => template.code.startsWith(prefix)) ||
      /^(DPF|DHF|DHS)-/.test(template.code) ||
      template.code === '245D-IAPP'
    )
    .map((template) => template.id)

  if (oldImportedTemplateIds.length > 0) {
    const { error: packetFormsDeleteError } = await supabase
      .from('packet_forms')
      .delete()
      .in('template_id', oldImportedTemplateIds)
    if (packetFormsDeleteError) throw packetFormsDeleteError

    const { error: fieldsDeleteError } = await supabase
      .from('form_fields')
      .delete()
      .in('template_id', oldImportedTemplateIds)
    if (fieldsDeleteError) throw fieldsDeleteError

    const { error: templatesDeleteError } = await supabase
      .from('form_templates')
      .delete()
      .in('id', oldImportedTemplateIds)
    if (templatesDeleteError) throw templatesDeleteError
  }

  let sortOrder = 100
  let templatesUpserted = 0
  let fieldsInserted = 0

  for (const form of forms) {
    const { data: template, error: templateError } = await supabase
      .from('form_templates')
      .upsert({
        code: form.code,
        name: form.name,
        description: form.description,
        packet_types: form.packet_types,
        sort_order: sortOrder,
        is_active: true,
        is_system: true,
      }, { onConflict: 'code' })
      .select('id')
      .single()

    if (templateError) throw templateError
    templatesUpserted += 1
    sortOrder += 10

    const { error: deleteError } = await supabase
      .from('form_fields')
      .delete()
      .eq('template_id', template.id)
    if (deleteError) throw deleteError

    if (form.fields.length > 0) {
      const { error: fieldError } = await supabase
        .from('form_fields')
        .insert(form.fields.map((field) => ({ ...field, template_id: template.id })))
      if (fieldError) throw fieldError
      fieldsInserted += form.fields.length
    }
  }

  const { data: packets, error: packetsError } = await supabase
    .from('packets')
    .select('id, packet_type')
  if (packetsError) throw packetsError

  const { data: templates, error: templatesError } = await supabase
    .from('form_templates')
    .select('id, packet_types, sort_order')
    .eq('is_active', true)
  if (templatesError) throw templatesError

  let packetFormsInserted = 0
  for (const packet of packets ?? []) {
    const matchingTemplates = (templates ?? []).filter((template) => template.packet_types?.includes(packet.packet_type))
    for (const template of matchingTemplates) {
      const { data: existing, error: existingError } = await supabase
        .from('packet_forms')
        .select('id')
        .eq('packet_id', packet.id)
        .eq('template_id', template.id)
        .maybeSingle()
      if (existingError) throw existingError
      if (existing) continue

      const { error } = await supabase
        .from('packet_forms')
        .insert({
          packet_id: packet.id,
          template_id: template.id,
          status: 'not_started',
          sort_order: template.sort_order ?? 0,
        })
      if (error) throw error
      packetFormsInserted += 1
    }
  }

  console.log(`Imported source PDFs: ${PACKET_DIRS.reduce((sum, item) => sum + fs.readdirSync(path.join(ROOT, item.dir)).filter((name) => name.toLowerCase().endsWith('.pdf')).length, 0)}`)
  console.log(`Unique templates upserted: ${templatesUpserted}`)
  console.log(`Fields inserted: ${fieldsInserted}`)
  console.log(`Packet forms inserted: ${packetFormsInserted}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
