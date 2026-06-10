import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getClientById } from '@/lib/clients/actions'
import { getClientGoals, getGoalStats } from '@/lib/goals/actions'
import { GoalCard, GoalCardSkeleton } from '@/components/goals/goal-card'
import { GoalFormModal } from './goal-form-modal'
import { Suspense } from 'react'

type Props = { params: Promise<{ id: string }> }

function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  )
}

export default async function GoalsPage({ params }: Props) {
  const { id } = await params
  const [{ data: client, error }, { data: goals }, { data: stats }] = await Promise.all([
    getClientById(id),
    getClientGoals(id),
    getGoalStats(id),
  ])

  if (error || !client) notFound()

  const activeGoals = (goals ?? []).filter((g) => g.status === 'active' || g.status === 'in_progress')
  const achievedGoals = (goals ?? []).filter((g) => g.status === 'achieved')
  const otherGoals = (goals ?? []).filter((g) => g.status !== 'active' && g.status !== 'in_progress' && g.status !== 'achieved')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/clients/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← Back to {client.legal_name}
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 mt-1">Service Goals</h1>
          <p className="text-sm text-gray-500">Person-centered planning goals tracked for 245D compliance</p>
        </div>
        <GoalFormModal clientId={id} />
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-3xl font-bold text-[#3A2A4A]">{stats.active + stats.in_progress}</p>
            <p className="text-sm text-[#64748B] mt-1">Active</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-3xl font-bold text-emerald-600">{stats.achieved}</p>
            <p className="text-sm text-[#64748B] mt-1">Achieved</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-3xl font-bold text-[#3A2A4A]">{stats.total}</p>
            <p className="text-sm text-[#64748B] mt-1">Total Goals</p>
          </div>
        </div>
      )}

      <Suspense fallback={
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <GoalCardSkeleton key={i} />)}
        </div>
      }>
        {goals && goals.length > 0 ? (
          <div className="space-y-6">
            {activeGoals.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-3">Active Goals</h2>
                <div className="space-y-3">
                  {activeGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      href={`/clients/${id}/goals/${goal.id}`}
                    />
                  ))}
                </div>
              </section>
            )}

            {achievedGoals.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-3">Achieved</h2>
                <div className="space-y-3">
                  {achievedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      href={`/clients/${id}/goals/${goal.id}`}
                    />
                  ))}
                </div>
              </section>
            )}

            {otherGoals.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-3">Other</h2>
                <div className="space-y-3">
                  {otherGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      href={`/clients/${id}/goals/${goal.id}`}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="flex justify-center mb-3 text-[#CBD5E1]">
              <TargetIcon />
            </div>
            <p className="text-[#3A2A4A] font-semibold">No goals yet</p>
            <p className="text-sm text-[#64748B] mt-1">
              Create your first service goal to start tracking person-centered progress.
            </p>
          </div>
        )}
      </Suspense>
    </div>
  )
}
