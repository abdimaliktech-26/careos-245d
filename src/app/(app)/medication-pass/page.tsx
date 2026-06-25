import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { ensureTodayTasks } from '@/lib/medications/actions'
import { MedicationPassBoard, type PassTask } from '@/components/medications/medication-pass-board'

export const dynamic = 'force-dynamic'

export default async function MedicationPassPage() {
  const { user, error } = await getSession()
  if (error || !user?.organizationId) redirect('/auth/login')

  // Idempotently materialise today's scheduled tasks before loading them.
  await ensureTodayTasks()

  const supabase = await createServerClient()
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const end = new Date(); end.setHours(23, 59, 59, 999)

  const { data } = await supabase
    .from('medication_pass_tasks')
    .select('id, due_at, status, medication_id, client_id, medications(name, dosage, route, is_prn, is_controlled, special_instructions), clients(legal_name, preferred_name, photo_url)')
    .gte('due_at', start.toISOString())
    .lte('due_at', end.toISOString())
    .order('due_at', { ascending: true })

  const tasks: PassTask[] = (data ?? []).map((t) => {
    const med = Array.isArray(t.medications) ? t.medications[0] : t.medications
    const cl = Array.isArray(t.clients) ? t.clients[0] : t.clients
    return {
      id: t.id,
      dueAt: t.due_at,
      status: t.status,
      medicationId: t.medication_id,
      clientId: t.client_id,
      medicationName: med?.name ?? 'Medication',
      dosage: med?.dosage ?? null,
      route: med?.route ?? null,
      isControlled: med?.is_controlled ?? false,
      specialInstructions: med?.special_instructions ?? null,
      clientName: cl?.preferred_name || cl?.legal_name || 'Client',
      clientPhoto: cl?.photo_url ?? null,
    }
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-foreground">Medication Pass</h1>
        <p className="text-[13px] text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} — tap a dose to record it.
        </p>
      </header>
      <MedicationPassBoard tasks={tasks} />
    </div>
  )
}
