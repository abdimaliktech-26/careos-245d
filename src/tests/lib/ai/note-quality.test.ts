import { describe, expect, test } from 'vitest'
import { buildNoteQualityPrompt, parseNoteQualityResponse } from '@/lib/ai/note-quality'

describe('buildNoteQualityPrompt', () => {
  test('includes note text and service context', () => {
    const prompt = buildNoteQualityPrompt({
      noteText: 'Assisted client with meal prep.',
      serviceType: 'ILS',
    })
    expect(prompt).toContain('Assisted client with meal prep.')
    expect(prompt).toContain('ILS')
  })

  test('handles missing service type', () => {
    const prompt = buildNoteQualityPrompt({ noteText: 'Note.', serviceType: null })
    expect(prompt).toContain('unspecified')
  })
})

describe('parseNoteQualityResponse', () => {
  test('parses valid JSON response', () => {
    const result = parseNoteQualityResponse(
      '{"score": 72, "issues": ["No start/end time"], "strengths": ["Clear activity description"]}'
    )
    expect(result).toEqual({
      score: 72,
      issues: ['No start/end time'],
      strengths: ['Clear activity description'],
    })
  })

  test('extracts JSON from fenced markdown', () => {
    const result = parseNoteQualityResponse(
      '```json\n{"score": 90, "issues": [], "strengths": ["Good"]}\n```'
    )
    expect(result?.score).toBe(90)
  })

  test('returns null for garbage', () => {
    expect(parseNoteQualityResponse('not json at all')).toBeNull()
  })

  test('clamps score to 0-100', () => {
    expect(parseNoteQualityResponse('{"score": 250, "issues": [], "strengths": []}')?.score).toBe(100)
    expect(parseNoteQualityResponse('{"score": -5, "issues": [], "strengths": []}')?.score).toBe(0)
  })
})
