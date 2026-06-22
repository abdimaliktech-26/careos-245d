/** Zero-dependency CSV serialization for audit exports (opens in Excel). */

type CsvCell = string | number | null | undefined

function escapeCell(value: CsvCell): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Serialize an array of flat record rows to a CSV string. Column order is taken
 * from the keys of the first row; rows missing a key render an empty cell.
 */
export function toCsv(rows: ReadonlyArray<Record<string, CsvCell>>): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(','))
  }
  return lines.join('\r\n')
}

/** Browser-side helper: trigger a CSV file download from rows. */
export function downloadCsv(filename: string, rows: ReadonlyArray<Record<string, CsvCell>>): void {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
