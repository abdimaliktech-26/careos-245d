import Link from 'next/link'
import type { Goal } from '@/lib/goals/types'

const CATEGORY_LABELS: Record<string, string> = {
  clinical: 'Clinical',
  behavioral: 'Behavioral',
  developmental: 'Developmental',
  social: 'Social',
  communication: 'Communication',
  daily_living: 'Daily Living',
  employment: 'Employment',
  education: 'Education',
  health: 'Health',
  other: 'Other',
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Active' },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'In Progress' },
  achieved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Achieved' },
  discontinued: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Discontinued' },
  revised: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Revised' },
}

const CATEGORY_COLORS: Record<string, string> = {
  clinical: '#E8799E',
  behavioral: '#F59E0B',
  developmental: '#10B981',
  social: '#8B5CF6',
  communication: '#EC4899',
  daily_living: '#F97316',
  employment: '#06B6D4',
  education: '#14B8A6',
  health: '#EF4444',
  other: '#64748B',
}

type GoalCardProps = {
  goal: Goal
  href: string
  latestProgress?: { progress_score: number | null } | null
}

export function GoalCard({ goal, href, latestProgress }: GoalCardProps) {
  const statusStyle = STATUS_STYLES[goal.status] ?? STATUS_STYLES.active
  const color = CATEGORY_COLORS[goal.category] ?? CATEGORY_COLORS.other
  const score = latestProgress?.progress_score ?? null

  return (
    <Link
      href={href}
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: `${color}1A`, color }}
            >
              {CATEGORY_LABELS[goal.category] ?? goal.category}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className="font-semibold text-[#3A2A4A] truncate">{goal.title}</p>
          {goal.description && (
            <p className="text-sm text-[#64748B] mt-1 line-clamp-2">{goal.description}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-[#64748B]">
        {goal.target_date && (
          <span>
            Target: {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        {score !== null && (
          <span className="font-semibold">
            Score: {score}%
          </span>
        )}
      </div>

      {goal.status === 'in_progress' && score !== null && (
        <div className="mt-3">
          <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${score}%`, backgroundColor: '#E8799E' }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}

export function GoalCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-16 rounded-full bg-gray-100" />
        <div className="h-5 w-16 rounded-full bg-gray-100" />
      </div>
      <div className="h-5 w-3/4 rounded bg-gray-100 mb-2" />
      <div className="h-4 w-full rounded bg-gray-100" />
      <div className="mt-4 flex gap-4">
        <div className="h-4 w-24 rounded bg-gray-100" />
        <div className="h-4 w-16 rounded bg-gray-100" />
      </div>
    </div>
  )
}
