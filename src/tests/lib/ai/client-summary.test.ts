import { describe, expect, test } from 'vitest'
import { buildClientSummaryPrompt } from '@/lib/ai/client-summary'

describe('buildClientSummaryPrompt', () => {
  const baseInput = {
    clientName: 'Maria Johnson',
    program: 'CRS',
    status: 'active',
    packets: [
      { packet_type: '45_day_review', status: 'in_progress', due_date: '2026-06-20' },
      { packet_type: 'intake', status: 'completed', due_date: '2026-04-01' },
    ],
    incidents: [
      { category: 'fall', status: 'open', occurred_at: '2026-06-01' },
    ],
    goals: [
      { title: 'Community participation', status: 'active' },
    ],
  }

  test('includes client identity and program', () => {
    const prompt = buildClientSummaryPrompt(baseInput)
    expect(prompt).toContain('Maria Johnson')
    expect(prompt).toContain('CRS')
  })

  test('lists packets with status and due date', () => {
    const prompt = buildClientSummaryPrompt(baseInput)
    expect(prompt).toContain('45 day review')
    expect(prompt).toContain('in_progress')
    expect(prompt).toContain('2026-06-20')
  })

  test('includes incidents and goals sections', () => {
    const prompt = buildClientSummaryPrompt(baseInput)
    expect(prompt).toContain('fall')
    expect(prompt).toContain('Community participation')
  })

  test('handles empty collections gracefully', () => {
    const prompt = buildClientSummaryPrompt({
      ...baseInput,
      packets: [],
      incidents: [],
      goals: [],
    })
    expect(prompt).toContain('No open packets')
    expect(prompt).toContain('No recent incidents')
    expect(prompt).toContain('No documented goals')
  })
})
