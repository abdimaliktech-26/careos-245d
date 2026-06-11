'use client'

import { useState, useCallback, useRef } from 'react'
import { validateCsvPreview, importClientsFromCsv, SYSTEM_FIELDS, type ColumnMapping, type CsvValidationResult, type ImportResult } from '@/lib/bulk/csv-import-ui'

type Step = 'upload' | 'preview' | 'mapping' | 'results'

export function CsvUploader() {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<CsvValidationResult | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const parseFile = useCallback(async (f: File) => {
    if (!f.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      alert('File must be under 5MB')
      return
    }

    setFile(f)
    const text = await f.text()
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) {
      alert('CSV must have a header row and at least one data row')
      return
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
    const dataRows = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
      return row
    })

    const validation = await validateCsvPreview(headers, dataRows)
    setParsed(validation)
    setRows(dataRows)
    setMapping(validation.suggestions)
    setStep('preview')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) parseFile(f)
  }, [parseFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
  }, [parseFile])

  const updateMapping = (csvColumn: string, systemField: string) => {
    setMapping(prev => prev.map(m => m.csvColumn === csvColumn ? { ...m, systemField } : m))
  }

  const handleImport = async () => {
    setImporting(true)
    const result = await importClientsFromCsv(rows, mapping)
    setImportResult(result)
    setStep('results')
    setImporting(false)
  }

  if (step === 'upload') {
    return (
      <div>
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-blue-50' : 'border-border hover:border-gray-300 bg-card'
          }`}
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
          </div>
          <p className="text-sm font-semibold text-foreground">
            Drop CSV file here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">CSV files only, max 5MB</p>
          <input ref={inputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
        </div>
      </div>
    )
  }

  if (step === 'preview' && parsed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">{file?.name}</p>
            <p className="text-xs text-muted-foreground">{parsed.rowCount} rows, {parsed.headers.length} columns</p>
          </div>
          <button
            onClick={() => { setStep('upload'); setFile(null); setParsed(null) }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40"
          >
            Change File
          </button>
        </div>

        {parsed.errors.length > 0 && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-semibold text-amber-700">Warnings:</p>
            <ul className="list-disc list-inside text-xs text-amber-600 mt-1">
              {parsed.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground mb-2">Preview (first {parsed.sampleRows.length} rows)</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted">
                  {parsed.headers.map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {parsed.sampleRows.map((row, i) => (
                  <tr key={i}>
                    {parsed.headers.map(h => <td key={h} className="px-3 py-2 text-foreground">{row[h] || '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={() => setStep('mapping')}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90"
        >
          Continue to Column Mapping
        </button>
      </div>
    )
  }

  if (step === 'mapping' && parsed) {
    const systemFields = [
      { key: '', label: '— Skip column —' },
      ...SYSTEM_FIELDS.map(f => ({ key: f.key, label: f.label })),
    ]

    return (
      <div className="space-y-4">
        <p className="text-sm font-bold text-foreground">Map CSV Columns to System Fields</p>
        <p className="text-xs text-muted-foreground">Match each CSV column to a field in the system.</p>

        <div className="space-y-2">
          {mapping.map((m) => (
            <div key={m.csvColumn} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
              <span className="text-sm font-medium text-foreground w-40">{m.csvColumn}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
              <select
                value={m.systemField}
                onChange={e => updateMapping(m.csvColumn, e.target.value)}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-xs bg-card"
              >
                {systemFields.map((sf: { key: string; label: string }) => (
                  <option key={sf.key} value={sf.key}>{sf.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setStep('preview')}
            className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/40"
          >
            Back
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-40"
          >
            {importing ? 'Importing...' : `Import ${rows.length} Clients`}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'results' && importResult) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 className="text-sm font-bold text-foreground mb-4">Import Results</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{importResult.imported}</p>
              <p className="text-[10px] font-semibold uppercase text-emerald-700">Imported</p>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-center">
              <p className="text-xl font-bold text-red-600">{importResult.errors.length}</p>
              <p className="text-[10px] font-semibold uppercase text-red-700">Errors</p>
            </div>
            <div className="rounded-xl bg-muted border border-border p-3 text-center">
              <p className="text-xl font-bold text-muted-foreground">{importResult.skipped}</p>
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Skipped</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Error Report:</p>
              <div className="max-h-48 overflow-y-auto bg-muted rounded-lg p-3">
                {importResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-600 font-mono mb-1">Row {e.row}: {e.message}</p>
                ))}
              </div>
              <button
                onClick={() => {
                  const csv = 'Row,Error\n' + importResult.errors.map(e => `${e.row},"${e.message}"`).join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'import-errors.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/40"
              >
                Download Error Report
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => { setStep('upload'); setFile(null); setParsed(null); setImportResult(null) }}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90"
        >
          Import Another File
        </button>
      </div>
    )
  }

  return null
}
