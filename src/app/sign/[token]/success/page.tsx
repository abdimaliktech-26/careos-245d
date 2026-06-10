import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

type Props = { params: Promise<{ token: string }> }

export default async function SigningSuccessPage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: link, error } = await admin
    .from('signing_links')
    .select(`
      token,
      signer_name,
      signer_role,
      completed_at,
      packet_form_id,
      packet_forms(
        id,
        form_templates(code, name, description)
      ),
      packets(
        clients(legal_name),
        organizations(name, logo_url)
      )
    `)
    .eq('token', token)
    .single()

  if (error || !link) notFound()
  if (!link.completed_at) redirect(`/sign/${token}`)

  const packet = Array.isArray(link.packets) ? link.packets[0] : link.packets
  const packetForm = Array.isArray(link.packet_forms) ? link.packet_forms[0] : link.packet_forms
  const template = Array.isArray(packetForm?.form_templates) ? packetForm?.form_templates[0] : packetForm?.form_templates
  const client = Array.isArray(packet?.clients) ? packet?.clients[0] : packet?.clients
  const organization = Array.isArray(packet?.organizations) ? packet?.organizations[0] : packet?.organizations

  return (
    <main className="min-h-screen bg-[#fffaf6] px-4 py-8 sm:px-5 sm:py-10">
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-4 flex items-center justify-center gap-3">
          {organization?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={organization.logo_url} alt="" className="h-10 w-10 rounded-2xl object-cover sm:h-12 sm:w-12" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#24343a] text-sm font-black text-white sm:h-12 sm:w-12 sm:text-base">CI</div>
          )}
          <p className="text-base font-black text-[#24343a] sm:text-lg">{organization?.name ?? 'CareIntake'}</p>
        </div>

        <div className="care-panel rounded-3xl p-8 sm:p-10">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 sm:h-24 sm:w-24">
            <svg className="h-10 w-10 text-green-600 sm:h-12 sm:w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>

          <h1 className="text-2xl font-black text-green-700 sm:text-3xl">Signature Complete!</h1>
          <p className="mt-2 text-sm text-[#667085]">Your electronic signature has been securely recorded.</p>

          <div className="mx-auto mt-6 space-y-2 rounded-xl bg-[#f8fafc] p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-[#667085]">Document</span>
              <span className="font-semibold text-[#24343a]">{template?.code} &middot; {template?.name}</span>
            </div>
            {template?.description && (
              <div className="flex justify-between">
                <span className="text-[#667085]">Description</span>
                <span className="max-w-[55%] text-right text-[#24343a]">{template.description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#667085]">Client</span>
              <span className="font-semibold text-[#24343a]">{client?.legal_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Signed by</span>
              <span className="font-semibold text-[#24343a]">{link.signer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085]">Date</span>
              <span className="font-semibold text-[#24343a]">
                {link.completed_at ? new Date(link.completed_at).toLocaleDateString('en-US', { dateStyle: 'long' }) : '—'}
              </span>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[#eadfd6] bg-[#fffaf6] p-4 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8B4B2D]">Next Steps</p>
            <ul className="mt-2 space-y-1 text-xs text-[#667085]">
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-green-600">&#10003;</span>
                <span>Your signature has been stored securely.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-[#8B4B2D]">&middot;</span>
                <span>The provider will notify you when all required signatures are collected.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="mt-0.5 text-[#8B4B2D]">&middot;</span>
                <span>You can contact the provider for a copy of the completed document.</span>
              </li>
            </ul>
          </div>

          <Link
            href="/client"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#f37d6d] px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90"
          >
            Go to my dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
