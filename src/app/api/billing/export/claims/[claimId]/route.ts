import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { generateCms1500Html } from '@/lib/billing/cms1500'
import { logAuditEvent } from '@/lib/audit/log'

type Props = {
  params: Promise<{ claimId: string }>
}

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { user, error: sessionError } = await getSession()
    if (sessionError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { claimId } = await params
    const supabase = await createClient()

    const { data: claim, error: claimError } = await supabase
      .from('claims')
      .select('*, clients(legal_name, date_of_birth, gender, address, city, state, zip, phone, medicaid_number)')
      .eq('id', claimId)
      .eq('organization_id', user.organizationId)
      .single()

    if (claimError || !claim) {
      return NextResponse.json(
        { error: 'Claim not found' },
        { status: 404 }
      )
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('name, address, city, state, zip, phone, npi')
      .eq('id', user.organizationId)
      .single()

    if (orgError) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    const client = claim.clients as Record<string, unknown> | null

    const html = generateCms1500Html({
      claimNumber: claim.claim_number,
      providerName: org?.name ?? '',
      providerAddress: [org?.address, org?.city, org?.state, org?.zip].filter(Boolean).join(', '),
      providerPhone: org?.phone ?? '',
      providerNpi: org?.npi ?? '',
      payerName: claim.payer,
      payerAddress: '',
      patientName: (client?.legal_name as string) ?? '',
      patientDob: ((client?.date_of_birth as string) ?? '').slice(0, 10),
      patientGender: (client?.gender as string) ?? '',
      patientAddress: [client?.address, client?.city, client?.state, client?.zip].filter(Boolean).join(', '),
      patientPhone: (client?.phone as string) ?? '',
      patientMedicaidId: (client?.medicaid_number as string) ?? '',
      insuredName: (client?.legal_name as string) ?? '',
      insuredMedicaidId: (client?.medicaid_number as string) ?? '',
      serviceDate: claim.service_date,
      cptCode: claim.cpt_code,
      modifier: claim.modifier ?? '',
      diagnosisCode: '',
      charges: (claim.amount ?? 0).toFixed(2),
      providerSignature: 'Electronically generated',
    })

    const filename = `CMS1500-${claim.claim_number}.html`

    await logAuditEvent({
      user,
      action: 'pdf_downloaded',
      entityType: 'claim',
      entityId: claim.id,
      entityLabel: `CMS-1500 export: ${claim.claim_number}`,
    }).catch(() => null)

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(Buffer.byteLength(html, 'utf-8')),
      },
    })
  } catch (err) {
    console.error('CMS-1500 export error:', err)
    return NextResponse.json(
      { error: 'Failed to generate CMS-1500 form' },
      { status: 500 }
    )
  }
}
