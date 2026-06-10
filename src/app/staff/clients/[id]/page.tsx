import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

export default async function StaffClientDetailRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/clients/${id}`)
}
