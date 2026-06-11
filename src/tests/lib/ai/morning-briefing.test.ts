import { describe, expect, test } from 'vitest'
import { buildMorningBriefingPrompt } from '@/lib/ai/morning-briefing'

describe('buildMorningBriefingPrompt', () => {
  const input = {
    userName: 'Sarah',
    activeClients: 42,
    overduePackets: 3,
    openIncidents: 2,
    trainingAlerts: 1,
    upcomingPackets: [
      { packet_type: '45_day_review', due_date: '2026-06-15', client_name: 'Maria J.' },
    ],
  }

  test('includes counts and user name', () => {
    const prompt = buildMorningBriefingPrompt(input)
    expect(prompt).toContain('Sarah')
    expect(prompt).toContain('Active clients: 42')
    expect(prompt).toContain('Overdue packets: 3')
    expect(prompt).toContain('Open incidents: 2')
  })

  test('lists upcoming deadlines', () => {
    const prompt = buildMorningBriefingPrompt(input)
    expect(prompt).toContain('45 day review')
    expect(prompt).toContain('2026-06-15')
    expect(prompt).toContain('Maria J.')
  })

  test('handles quiet day', () => {
    const prompt = buildMorningBriefingPrompt({
      ...input,
      overduePackets: 0,
      openIncidents: 0,
      trainingAlerts: 0,
      upcomingPackets: [],
    })
    expect(prompt).toContain('No deadlines in the next 7 days')
  })
})
