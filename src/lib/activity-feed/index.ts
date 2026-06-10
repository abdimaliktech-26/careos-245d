'use server'

import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth/get-session'

export type ActivityEntry = {
  id: string
  type: 'signature' | 'form' | 'incident' | 'evv' | 'note' | 'document' | 'message' | 'goal' | 'goal_progress'
  action: string
  description: string
  timestamp: string
  userId: string | null
  userName: string
}

export async function getClientActivity(
  clientId: string,
  limit = 50,
  offset = 0
): Promise<{ error: string | null; data: ActivityEntry[] }> {
  const { user, error: sessionError } = await getSession()
  if (sessionError || !user || !user.organizationId) return { error: 'Unauthorized', data: [] }

  const supabase = await createClient()

  const [
    { data: signatures },
    { data: packetForms },
    { data: incidents },
    { data: evvVisits },
    { data: shiftNotes },
    { data: documents },
    { data: messages },
    { data: goals },
    { data: goalProgress },
  ] = await Promise.all([
    supabase
      .from('signatures')
      .select('id, signed_at, signer_name, signer_role, created_at')
      .eq('organization_id', user.organizationId)
      .in('packet_id', (await supabase.from('packets').select('id').eq('client_id', clientId).eq('organization_id', user.organizationId)).data?.map((p) => p.id) ?? []),

    supabase
      .from('packet_forms')
      .select('id, status, submitted_at, updated_at, form_templates(name)')
      .in('packet_id', (await supabase.from('packets').select('id').eq('client_id', clientId).eq('organization_id', user.organizationId)).data?.map((p) => p.id) ?? []),

    supabase
      .from('incidents')
      .select('id, category, status, occurred_at, created_at')
      .eq('client_id', clientId)
      .eq('organization_id', user.organizationId),

    supabase
      .from('evv_visits')
      .select('id, service_name, status, actual_start, actual_end, created_at')
      .eq('client_id', clientId)
      .eq('organization_id', user.organizationId),

    supabase
      .from('shift_notes')
      .select('id, visit_date, service_type, staff_name, created_at')
      .eq('client_id', clientId)
      .eq('organization_id', user.organizationId),

    supabase
      .from('documents')
      .select('id, display_name, category, created_at')
      .eq('client_id', clientId)
      .eq('organization_id', user.organizationId),

    supabase
      .from('portal_messages')
      .select('id, sender_name, is_from_staff, created_at')
      .eq('client_id', clientId)
      .eq('organization_id', user.organizationId),

    supabase
      .from('goals')
      .select('id, title, status, created_at, updated_at')
      .eq('client_id', clientId)
      .eq('organization_id', user.organizationId),

    supabase
      .from('goal_progress')
      .select('id, goal_id, progress_note, progress_score, recorded_at, goals!inner(client_id)')
      .eq('goals.client_id', clientId),
  ])

  const entries: ActivityEntry[] = []

  for (const s of signatures ?? []) {
    entries.push({
      id: `sig-${s.id}`,
      type: 'signature',
      action: 'signed_document',
      description: `${s.signer_name} signed as ${s.signer_role.replaceAll('_', ' ')}`,
      timestamp: s.signed_at ?? s.created_at,
      userId: null,
      userName: s.signer_name,
    })
  }

  for (const pf of packetForms ?? []) {
    const templateName = (pf.form_templates as { name?: string } | null)?.name ?? 'Form'
    if (pf.status === 'completed') {
      entries.push({
        id: `pf-${pf.id}`,
        type: 'form',
        action: 'form_completed',
        description: `${templateName} completed`,
        timestamp: pf.submitted_at ?? pf.updated_at,
        userId: null,
        userName: 'System',
      })
    }
  }

  for (const inc of incidents ?? []) {
    entries.push({
      id: `inc-${inc.id}`,
      type: 'incident',
      action: `incident_${inc.status}`,
      description: `${inc.category.replaceAll('_', ' ')} incident ${inc.status.replaceAll('_', ' ')}`,
      timestamp: inc.occurred_at ?? inc.created_at,
      userId: null,
      userName: 'System',
    })
  }

  for (const evv of evvVisits ?? []) {
    const status = evv.status
    const action = status === 'completed' ? 'visit_completed' : status === 'in_progress' ? 'visit_started' : 'visit_scheduled'
    entries.push({
      id: `evv-${evv.id}`,
      type: 'evv',
      action,
      description: `EVV visit: ${evv.service_name ?? 'Service'} ${status.replaceAll('_', ' ')}`,
      timestamp: evv.actual_end ?? evv.actual_start ?? evv.created_at,
      userId: null,
      userName: 'System',
    })
  }

  for (const note of shiftNotes ?? []) {
    entries.push({
      id: `note-${note.id}`,
      type: 'note',
      action: 'shift_note_written',
      description: `Shift note: ${note.service_type.replaceAll('_', ' ')} on ${note.visit_date}`,
      timestamp: note.created_at,
      userId: null,
      userName: note.staff_name ?? 'Staff',
    })
  }

  for (const doc of documents ?? []) {
    entries.push({
      id: `doc-${doc.id}`,
      type: 'document',
      action: 'document_uploaded',
      description: `${doc.display_name} uploaded`,
      timestamp: doc.created_at,
      userId: null,
      userName: 'System',
    })
  }

  for (const msg of messages ?? []) {
    entries.push({
      id: `msg-${msg.id}`,
      type: 'message',
      action: msg.is_from_staff ? 'staff_message' : 'client_reply',
      description: msg.is_from_staff ? `Staff sent a message` : `${msg.sender_name} replied`,
      timestamp: msg.created_at,
      userId: null,
      userName: msg.sender_name,
    })
  }

  for (const goal of goals ?? []) {
    entries.push({
      id: `goal-${goal.id}`,
      type: 'goal',
      action: `goal_${goal.status}`,
      description: `Goal: ${goal.title} — ${goal.status.replaceAll('_', ' ')}`,
      timestamp: goal.updated_at ?? goal.created_at,
      userId: null,
      userName: 'System',
    })
  }

  for (const gp of goalProgress ?? []) {
    entries.push({
      id: `gp-${gp.id}`,
      type: 'goal_progress',
      action: 'goal_progress_recorded',
      description: `Goal progress: ${gp.progress_score != null ? `Score ${gp.progress_score}/100` : 'Updated'} — ${(gp.progress_note ?? '').slice(0, 80)}`,
      timestamp: gp.recorded_at,
      userId: null,
      userName: 'System',
    })
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return { error: null, data: entries.slice(offset, offset + limit) }
}
