import { redirect } from 'next/navigation'

// Redirects to the canonical (app) route — all client pages live under (app)/clients
export default function StaffClientsRedirect() {
  redirect('/clients')
}
