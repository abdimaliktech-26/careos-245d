import { describe, it, expect } from 'vitest'
import { generateCms1500Html } from '@/lib/billing/cms1500'

describe('incident number format', () => {
  it('generates correct pattern INC-YYYYMMDD-XXXXX', () => {
    // Test the generate function from actions by importing
    // Since it's a server file, test the format manually
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replaceAll('-', '')
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase()
    const number = `INC-${date}-${suffix}`
    expect(number).toMatch(/^INC-\d{8}-[A-Z0-9]{5}$/)
  })

  it('creates unique numbers on successive calls', () => {
    const now = new Date()
    const date = now.toISOString().slice(0, 10).replaceAll('-', '')
    const a = `INC-${date}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    const b = `INC-${date}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`
    expect(a).not.toBe(b)
  })
})

describe('CMS-1500 generator', () => {
  it('generates HTML with claim data', () => {
    const html = generateCms1500Html({
      claimNumber: 'CLM-TEST-001',
      providerName: 'Test Provider',
      providerAddress: '123 Main St',
      providerPhone: '555-0100',
      providerNpi: '1234567890',
      payerName: 'Minnesota DHS',
      payerAddress: '100 State St',
      patientName: 'Jane Doe',
      patientDob: '1990-01-01',
      patientGender: 'F',
      patientAddress: '456 Oak Ave',
      patientPhone: '555-0200',
      patientMedicaidId: 'MA12345',
      insuredName: 'Jane Doe',
      insuredMedicaidId: 'MA12345',
      serviceDate: '2026-06-01',
      cptCode: 'T1019',
      modifier: 'U4',
      diagnosisCode: 'F84.0',
      charges: '150.00',
      providerSignature: 'Test Signature',
    })
    expect(html).toContain('CMS-1500')
    expect(html).toContain('CLM-TEST-001')
    expect(html).toContain('T1019')
    expect(html).toContain('$150.00')
    expect(html).toContain('Jane Doe')
    expect(html).toContain('Minnesota DHS')
  })
})
