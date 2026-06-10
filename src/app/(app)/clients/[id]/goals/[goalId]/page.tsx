import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getGoal } from '@/lib/goals/actions'
import { ProgressTimeline, ProgressChart } from '@/components/goals/progress-timeline'
import { ProgressFormModal } from './progress-form-modal'
import { GoalEditButton } from './goal-edit-button'
import type { GoalStatus } from '@/lib/goals/types'

type Props = { params: Promise<{ id: string; goalId: string }> }

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Active' },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'In Progress' },
  achieved: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Achieved' },
  discontinued: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Discontinued' },
  revised: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Revised' },
}

export default async function GoalDetailPage({ params }: Props) {
  const { id: clientId, goalId } = await params
  const { data: goal, error } = await getGoal(goalId)

  if (error || !goal) notFound()

  const statusStyle = STATUS_STYLES[goal.status] ?? STATUS_STYLES.active
  const progress = goal.goal_progress ?? []
  const latestScore = progress.length > 0 ? progress[0].progress_score : null
  const avgScore = progress.filter((p) => p.progress_score !== null).length > 0
    ? Math.round(
        progress
          .filter((p) => p.progress_score !== null)
          .reduce((sum, p) => sum + p.progress_score!, 0) /
          progress.filter((p) => p.progress_score !== null).length
      )
    : null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/clients/${clientId}/goals`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to goals
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">{goal.title}</h1>
        </div>
        <GoalEditButton goal={goal} clientId={clientId} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
            {statusStyle.label}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-600 capitalize">
            {goal.category.replace('_', ' ')}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {goal.description && (
            <div className="col-span-2">
              <dt className="text-[#64748B]">Description</dt>
              <dd className="text-[#3A2A4A] mt-0.5 whitespace-pre-wrap">{goal.description}</dd>
            </div>
          )}
          <div>
            <dt className="text-[#64748B]">Start Date</dt>
            <dd className="text-[#3A2A4A] font-medium mt-0.5">
              {goal.start_date
                ? new Date(goal.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[#64748B]">Target Date</dt>
            <dd className="text-[#3A2A4A] font-medium mt-0.5">
              {goal.target_date
                ? new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '—'}
            </dd>
          </div>
          {goal.achieved_date && (
            <div>
              <dt className="text-[#64748B]">Achieved Date</dt>
              <dd className="text-[#3A2A4A] font-medium mt-0.5">
                {new Date(goal.achieved_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#3A2A4A]">{progress.length}</p>
          <p className="text-xs text-[#64748B] mt-0.5">Progress Entries</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#3A2A4A]">
            {latestScore !== null ? `${latestScore}%` : '—'}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">Latest Score</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#3A2A4A]">
            {avgScore !== null ? `${avgScore}%` : '—'}
          </p>
          <p className="text-xs text-[#64748B] mt-0.5">Average Score</p>
        </div>
      </div>

      {progress.length >= 2 && <ProgressChart progress={progress} />}

      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#3A2A4A]">Progress Timeline</h2>
          <ProgressFormModal goalId={goalId} />
        </div>
        <ProgressTimeline progress={progress} />
      </section>
    </div>
  )
}
