import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/get-session'
import { createClient } from '@/lib/supabase/server'
import { getClientVideos } from '@/lib/video-docs/actions'
import { VideoPageClient } from './client'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ClientVideosPage({ params }: Props) {
  const { user, error } = await getSession()
  if (error || !user) redirect('/auth/login')

  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, legal_name')
    .eq('id', id)
    .eq('organization_id', user.organizationId)
    .single()

  if (!client) return <p className="p-8 text-sm text-muted-foreground">Client not found.</p>

  const videos = await getClientVideos(id)

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <Link href={`/clients/${id}`} className="text-xs text-primary hover:underline mb-1 inline-block">
          ← Back to {client.legal_name}
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Videos — {client.legal_name}</h1>
      </div>

      <VideoPageClient clientId={id} initialVideos={videos} />
    </div>
  )
}
