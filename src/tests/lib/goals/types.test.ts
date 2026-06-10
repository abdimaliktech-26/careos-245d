import { describe, it, expect } from 'vitest'
import type { Goal, GoalProgress, GoalStats, GoalStatus, GoalCategory } from '@/lib/goals/types'

describe('GoalStatus type', () => {
  it('includes all expected status values', () => {
    const statuses: GoalStatus[] = ['active', 'in_progress', 'achieved', 'discontinued', 'revised']
    expect(statuses).toHaveLength(5)
    expect(statuses).toContain('active')
    expect(statuses).toContain('in_progress')
    expect(statuses).toContain('achieved')
    expect(statuses).toContain('discontinued')
    expect(statuses).toContain('revised')
  })
})

describe('GoalCategory type', () => {
  it('includes all expected category values', () => {
    const categories: GoalCategory[] = [
      'clinical', 'behavioral', 'developmental', 'social',
      'communication', 'daily_living', 'employment', 'education',
      'health', 'other',
    ]
    expect(categories).toHaveLength(10)
    expect(categories).toContain('clinical')
    expect(categories).toContain('behavioral')
    expect(categories).toContain('developmental')
    expect(categories).toContain('social')
    expect(categories).toContain('communication')
    expect(categories).toContain('daily_living')
    expect(categories).toContain('employment')
    expect(categories).toContain('education')
    expect(categories).toContain('health')
    expect(categories).toContain('other')
  })
})

describe('Goal type shape', () => {
  const validGoal: Goal = {
    id: 'g-001',
    organization_id: 'org-1',
    client_id: 'c-001',
    title: 'Improve daily living skills',
    description: 'Work on independent grooming',
    category: 'daily_living',
    status: 'active',
    target_date: '2026-12-31',
    start_date: '2026-06-01',
    achieved_date: null,
    created_by: 'user-1',
    created_at: '2026-06-01T00:00:00Z',
    updated_at: '2026-06-01T00:00:00Z',
  }

  it('accepts a minimal goal without optional fields', () => {
    const goal: Goal = {
      id: 'g-001',
      organization_id: 'org-1',
      client_id: 'c-001',
      title: 'Test goal',
      description: null,
      category: 'clinical',
      status: 'active',
      target_date: null,
      start_date: null,
      achieved_date: null,
      created_by: 'user-1',
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
    }
    expect(goal.title).toBe('Test goal')
    expect(goal.description).toBeNull()
  })

  it('accepts all field types correctly', () => {
    expect(typeof validGoal.id).toBe('string')
    expect(typeof validGoal.title).toBe('string')
    expect(typeof validGoal.category).toBe('string')
    expect(typeof validGoal.status).toBe('string')
    expect(typeof validGoal.created_at).toBe('string')
  })
})

describe('GoalProgress type shape', () => {
  it('accepts a valid progress record', () => {
    const progress: GoalProgress = {
      id: 'gp-001',
      goal_id: 'g-001',
      packet_form_id: 'pf-001',
      progress_note: 'Made significant progress on grooming routine',
      progress_score: 75,
      recorded_by: 'user-1',
      recorded_at: '2026-06-15T00:00:00Z',
    }
    expect(progress.progress_score).toBe(75)
    expect(progress.progress_note).toContain('progress')
  })

  it('accepts null score and packet form id', () => {
    const progress: GoalProgress = {
      id: 'gp-002',
      goal_id: 'g-001',
      packet_form_id: null,
      progress_note: 'Ongoing observation',
      progress_score: null,
      recorded_by: 'user-1',
      recorded_at: '2026-06-15T00:00:00Z',
    }
    expect(progress.progress_score).toBeNull()
    expect(progress.packet_form_id).toBeNull()
  })
})

describe('GoalStats type shape', () => {
  it('accepts a valid stats object', () => {
    const stats: GoalStats = {
      active: 3,
      in_progress: 2,
      achieved: 5,
      total: 10,
    }
    expect(stats.active + stats.in_progress + stats.achieved).toBeLessThanOrEqual(stats.total)
  })

  it('handles zero counts', () => {
    const stats: GoalStats = { active: 0, in_progress: 0, achieved: 0, total: 0 }
    expect(stats.total).toBe(0)
  })
})
