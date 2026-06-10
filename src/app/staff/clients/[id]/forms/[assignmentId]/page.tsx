import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string; assignmentId: string }> }

export default async function StaffFormFillRedirect({ params }: Props) {
  const { id, assignmentId } = await params
  redirect(`/clients/${id}/forms/${assignmentId}`)
}
