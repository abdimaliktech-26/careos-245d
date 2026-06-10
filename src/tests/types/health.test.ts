import { describe, it, expect } from 'vitest'
import { VITAL_LABELS, VITAL_UNITS, getVitalLabel, getVitalUnit } from '@/types/health'

const VITAL_TYPES = [
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'heart_rate',
  'temperature',
  'respiratory_rate',
  'oxygen_saturation',
  'blood_glucose',
  'weight',
  'height',
  'bmi',
  'pain_level',
  'other',
] as const

describe('VITAL_LABELS', () => {
  it('covers every vital type', () => {
    for (const type of VITAL_TYPES) {
      expect(VITAL_LABELS).toHaveProperty(type)
    }
  })

  it('has exactly 12 entries', () => {
    expect(Object.keys(VITAL_LABELS)).toHaveLength(12)
  })

  it('returns human-readable labels', () => {
    expect(VITAL_LABELS.blood_pressure_systolic).toBe('BP Systolic')
    expect(VITAL_LABELS.blood_pressure_diastolic).toBe('BP Diastolic')
    expect(VITAL_LABELS.heart_rate).toBe('Heart Rate')
    expect(VITAL_LABELS.temperature).toBe('Temperature')
    expect(VITAL_LABELS.respiratory_rate).toBe('Respiratory Rate')
    expect(VITAL_LABELS.oxygen_saturation).toBe('O₂ Sat')
    expect(VITAL_LABELS.blood_glucose).toBe('Blood Glucose')
    expect(VITAL_LABELS.weight).toBe('Weight')
    expect(VITAL_LABELS.height).toBe('Height')
    expect(VITAL_LABELS.bmi).toBe('BMI')
    expect(VITAL_LABELS.pain_level).toBe('Pain Level')
    expect(VITAL_LABELS.other).toBe('Other')
  })
})

describe('VITAL_UNITS', () => {
  it('covers every vital type', () => {
    for (const type of VITAL_TYPES) {
      expect(VITAL_UNITS).toHaveProperty(type)
    }
  })

  it('has exactly 12 entries', () => {
    expect(Object.keys(VITAL_UNITS)).toHaveLength(12)
  })

  it('returns correct units', () => {
    expect(VITAL_UNITS.blood_pressure_systolic).toBe('mmHg')
    expect(VITAL_UNITS.blood_pressure_diastolic).toBe('mmHg')
    expect(VITAL_UNITS.heart_rate).toBe('bpm')
    expect(VITAL_UNITS.temperature).toBe('°F')
    expect(VITAL_UNITS.respiratory_rate).toBe('breaths/min')
    expect(VITAL_UNITS.oxygen_saturation).toBe('%')
    expect(VITAL_UNITS.blood_glucose).toBe('mg/dL')
    expect(VITAL_UNITS.weight).toBe('lbs')
    expect(VITAL_UNITS.height).toBe('in')
    expect(VITAL_UNITS.bmi).toBe('kg/m²')
    expect(VITAL_UNITS.pain_level).toBe('/10')
    expect(VITAL_UNITS.other).toBe('')
  })
})

describe('getVitalLabel', () => {
  it('returns label for each known type', () => {
    expect(getVitalLabel('blood_pressure_systolic')).toBe('BP Systolic')
    expect(getVitalLabel('heart_rate')).toBe('Heart Rate')
    expect(getVitalLabel('oxygen_saturation')).toBe('O₂ Sat')
    expect(getVitalLabel('bmi')).toBe('BMI')
  })

  it('falls back to underscore replacement for unknown types', () => {
    expect(getVitalLabel('unknown_type')).toBe('unknown type')
  })

  it('handles empty string fallback', () => {
    expect(getVitalLabel('')).toBe('')
  })

  it('handles single word unknown type', () => {
    expect(getVitalLabel('unknown')).toBe('unknown')
  })

  it('handles multiple underscores', () => {
    expect(getVitalLabel('very_custom_vital_sign')).toBe('very custom vital sign')
  })
})

describe('getVitalUnit', () => {
  it('returns unit for each known type', () => {
    expect(getVitalUnit('blood_pressure_systolic')).toBe('mmHg')
    expect(getVitalUnit('heart_rate')).toBe('bpm')
    expect(getVitalUnit('temperature')).toBe('°F')
    expect(getVitalUnit('oxygen_saturation')).toBe('%')
    expect(getVitalUnit('pain_level')).toBe('/10')
  })

  it('returns empty string for unknown types', () => {
    expect(getVitalUnit('unknown_type')).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(getVitalUnit('')).toBe('')
  })

  it('returns empty string for other type', () => {
    expect(getVitalUnit('other')).toBe('')
  })
})

describe('VITAL_LABELS and VITAL_UNITS alignment', () => {
  it('has identical keys in both maps', () => {
    const labelKeys = Object.keys(VITAL_LABELS).sort()
    const unitKeys = Object.keys(VITAL_UNITS).sort()
    expect(labelKeys).toEqual(unitKeys)
  })
})
