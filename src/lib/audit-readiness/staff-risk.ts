import { createClient } from '@/lib/supabase/server'
import { scoreFromGaps, riskFromScore, type AuditRiskLevel } from './score'

export const EXPIRING_WINDOW_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

export interface StaffGap {
  code: string
  label: string
  risk: AuditRiskLevel
}

export interface StaffRisk {
  staffId: string
  name: string
  title: string | null
  gaps: StaffGap[]
  score: number
  riskLevel: AuditRiskLevel
}

export interface TrainingLite {
  training_name: string
  status: string
  expiration_date: string | null
}

export interface StaffProfileLite {
  id: string
  full_name: string
  title: string | null
  role: string
  background_study_status: string
  background_study_expires: string | null
}

export interface UpcomingExpiration {
  staffId: string
  name: string
  item: string
  expiresOn: string
  daysUntil: number
}

export interface StaffComplianceResult {
  staff: StaffRisk[]
  highRisk: StaffRisk[]
  upcomingExpirations: UpcomingExpiration[]
  hasDesignatedCoordinator: boolean
  hasDesignatedManager: boolean
  averageScore: number
}

function daysUntil(date: string, now: Date): number {
  return Math.round((new Date(date).getTime() - now.getTime()) / DAY_MS)
}

function hasTraining(trainings: ReadonlyArray<TrainingLite>, keyword: string): TrainingLite | undefined {
  return trainings.find((t) => t.training_name.toLowerCase().includes(keyword.toLowerCase()))
}

/** Pure compliance evaluation for a single staff member. */
export function evaluateStaffGaps(
  profile: StaffProfileLite,
  trainings: ReadonlyArray<TrainingLite>,
  now: Date = new Date(),
): StaffGap[] {
  const gaps: StaffGap[] = []

  // Background study (245D requires a clear study).
  if (profile.background_study_status !== 'clear') {
    gaps.push({ code: 'background_study', label: 'Background study not cleared', risk: 'high' })
  } else if (profile.background_study_expires && new Date(profile.background_study_expires) < now) {
    gaps.push({ code: 'background_study_expired', label: 'Background study expired', risk: 'high' })
  }

  // CPR / First Aid presence + currency.
  for (const cert of ['CPR', 'First Aid']) {
    const t = hasTraining(trainings, cert)
    if (!t) {
      gaps.push({ code: `missing_${cert.toLowerCase().replace(/\s+/g, '_')}`, label: `Missing ${cert} certification`, risk: 'moderate' })
    } else if (t.status === 'expired' || (t.expiration_date && new Date(t.expiration_date) < now)) {
      gaps.push({ code: `expired_${cert.toLowerCase().replace(/\s+/g, '_')}`, label: `${cert} certification expired`, risk: 'moderate' })
    }
  }

  // General training completion (any expired/not-completed training is a gap).
  const incomplete = trainings.filter((t) => t.status === 'expired' || t.status === 'not_completed')
  if (incomplete.length > 0) {
    gaps.push({ code: 'incomplete_training', label: `${incomplete.length} training(s) incomplete or expired`, risk: 'moderate' })
  }

  return gaps
}

function isCoordinator(p: StaffProfileLite): boolean {
  const t = (p.title ?? '').toLowerCase()
  return t.includes('coordinator') || p.role === 'program_manager'
}

function isManager(p: StaffProfileLite): boolean {
  const t = (p.title ?? '').toLowerCase()
  return t.includes('manager') || p.role === 'org_admin'
}

/** Fetch + analyze staff compliance for an org. */
export async function analyzeStaffCompliance(organizationId: string): Promise<StaffComplianceResult> {
  const supabase = await createClient()

  const [{ data: profiles }, { data: trainings }] = await Promise.all([
    supabase
      .from('staff_profiles')
      .select('id, full_name, title, role, background_study_status, background_study_expires')
      .eq('organization_id', organizationId)
      .eq('is_active', true),
    supabase
      .from('staff_trainings')
      .select('staff_id, training_name, status, expiration_date')
      .eq('organization_id', organizationId),
  ])

  const now = new Date()
  const trainingsByStaff = new Map<string, TrainingLite[]>()
  for (const t of (trainings ?? []) as Array<{ staff_id: string } & TrainingLite>) {
    const list = trainingsByStaff.get(t.staff_id) ?? []
    list.push({ training_name: t.training_name, status: t.status, expiration_date: t.expiration_date })
    trainingsByStaff.set(t.staff_id, list)
  }

  const profileList = (profiles ?? []) as StaffProfileLite[]
  const staff: StaffRisk[] = profileList.map((p) => {
    const gaps = evaluateStaffGaps(p, trainingsByStaff.get(p.id) ?? [], now)
    const score = scoreFromGaps(gaps)
    return { staffId: p.id, name: p.full_name, title: p.title, gaps, score, riskLevel: riskFromScore(score) }
  })

  const upcomingExpirations: UpcomingExpiration[] = []
  for (const p of profileList) {
    for (const t of trainingsByStaff.get(p.id) ?? []) {
      if (!t.expiration_date) continue
      const d = daysUntil(t.expiration_date, now)
      if (d >= 0 && d <= EXPIRING_WINDOW_DAYS) {
        upcomingExpirations.push({ staffId: p.id, name: p.full_name, item: t.training_name, expiresOn: t.expiration_date, daysUntil: d })
      }
    }
    if (p.background_study_expires) {
      const d = daysUntil(p.background_study_expires, now)
      if (d >= 0 && d <= EXPIRING_WINDOW_DAYS) {
        upcomingExpirations.push({ staffId: p.id, name: p.full_name, item: 'Background study', expiresOn: p.background_study_expires, daysUntil: d })
      }
    }
  }
  upcomingExpirations.sort((a, b) => a.daysUntil - b.daysUntil)

  const averageScore = staff.length === 0 ? 100 : Math.round(staff.reduce((s, x) => s + x.score, 0) / staff.length)

  return {
    staff: staff.sort((a, b) => a.score - b.score),
    highRisk: staff.filter((s) => s.riskLevel === 'high'),
    upcomingExpirations,
    hasDesignatedCoordinator: profileList.some(isCoordinator),
    hasDesignatedManager: profileList.some(isManager),
    averageScore,
  }
}
