import { describe, test, expect } from 'vitest'
import { rollupVerdict } from '../types'

describe('rollupVerdict', () => {
  test('returns fail when any check fails', () => {
    expect(rollupVerdict([
      { key: 'a', label: 'A', status: 'pass' },
      { key: 'b', label: 'B', status: 'fail' },
      { key: 'c', label: 'C', status: 'warn' },
    ])).toBe('fail')
  })
  test('returns warn when worst is warn', () => {
    expect(rollupVerdict([
      { key: 'a', label: 'A', status: 'pass' },
      { key: 'b', label: 'B', status: 'warn' },
    ])).toBe('warn')
  })
  test('returns pass when all pass', () => {
    expect(rollupVerdict([{ key: 'a', label: 'A', status: 'pass' }])).toBe('pass')
  })
  test('returns pass for empty input', () => {
    expect(rollupVerdict([])).toBe('pass')
  })
})
