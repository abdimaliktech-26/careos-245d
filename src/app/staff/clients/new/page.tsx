import { redirect } from 'next/navigation'

export default function StaffNewClientRedirect() {
  redirect('/clients/new')
}
