import { createClient } from '@/lib/supabase/server'
import { validateRequiredSignatures } from '@/lib/forms/signature-validation'

export type BillingReadinessReport = {
  generatedAt: string
  readyForms: number
  blockedForms: number
  overduePackets: number
  evvExceptions: number
  missingDocuments: number
  items: Array<{
    id: string
    clientName: string
    program: string
    packetType: string
    formName: string
    status: 'ready' | 'blocked'
    issues: string[]
    href: string
  }>
}

export async function getBillingReadinessReport(organizationId: string): Promise<BillingReadinessReport> {
  const supabase = await createClient()
  const [{ data: forms }, { data: documents }, { data: overduePackets }, { data: evvVisits }] = await Promise.all([
    supabase
      .from('packet_forms')
      .select(`
        id,
        status,
        packet_id,
        signatures(signer_role),
        packets!inner(id, organization_id, client_id, packet_type, status, clients(legal_name, program)),
        form_templates(name)
      `)
      .eq('packets.organization_id', organizationId)
      .in('status', ['needs_signature', 'completed']),
    supabase
      .from('documents')
      .select('storage_path')
      .eq('organization_id', organizationId),
    supabase
      .from('packets')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'overdue'),
    supabase
      .from('evv_visits')
      .select('id')
      .eq('organization_id', organizationId)
      .in('status', ['missed', 'exception']),
  ])

  const documentPaths = ((documents ?? []) as Array<{ storage_path: string | null }>).map((row) => row.storage_path ?? '')
  const items = ((forms ?? []) as Array<Record<string, unknown>>).map((form) => {
    const packet = form.packets as {
      client_id: string
      packet_type: string
      clients: { legal_name: string; program: string } | null
    } | null
    const template = form.form_templates as { name: string } | null
    const signatures = (form.signatures ?? []) as Array<{ signer_role: string }>
    const signatureValidation = validateRequiredSignatures(signatures)
    const issues = [
      form.status !== 'completed' ? 'Form is not completed' : null,
      !signatureValidation.isValid ? `Missing ${signatureValidation.missing.join(' and ')}` : null,
      !documentPaths.some((path) => path.includes(`/${form.id as string}/`)) ? 'Stored branded document is missing' : null,
    ].filter((issue): issue is string => Boolean(issue))

    return {
      id: form.id as string,
      clientName: packet?.clients?.legal_name ?? 'Client',
      program: packet?.clients?.program ?? '-',
      packetType: packet?.packet_type ?? '-',
      formName: template?.name ?? 'Form',
      status: issues.length === 0 ? 'ready' as const : 'blocked' as const,
      issues,
      href: packet ? `/clients/${packet.client_id}` : '/clients',
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    readyForms: items.filter((item) => item.status === 'ready').length,
    blockedForms: items.filter((item) => item.status === 'blocked').length,
    overduePackets: overduePackets?.length ?? 0,
    evvExceptions: evvVisits?.length ?? 0,
    missingDocuments: items.filter((item) => item.issues.includes('Stored branded document is missing')).length,
    items: items.toSorted((a, b) => Number(a.status === 'ready') - Number(b.status === 'ready')).slice(0, 100),
  }
}
