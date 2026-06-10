import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/get-session'
import { CsvUploader } from '@/components/bulk/csv-uploader'

export default async function ImportPage() {
  const { user, error } = await getSession()
  if (error || !user || !['org_admin', 'super_admin'].includes(user.role))
    redirect('/dashboard')

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#E8799E]">Admin</p>
        <h1 className="mt-2 text-3xl font-black text-[#111827]">Import Clients</h1>
        <p className="mt-2 text-sm text-gray-500">
          Upload a CSV file to bulk-import client records. Map your CSV columns to system fields before importing.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 className="text-sm font-bold text-[#3A2A4A] mb-4">CSV Upload</h2>
        <CsvUploader />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h2 className="text-sm font-bold text-[#3A2A4A] mb-2">CSV Format Requirements</h2>
        <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
          <li>First row must be column headers</li>
          <li>Required columns: Legal Name, Date of Birth, Program</li>
          <li>Accepted formats: <code className="bg-gray-100 px-1 rounded">.csv</code> with comma-separated values</li>
          <li>Maximum file size: 5MB</li>
          <li>Quoted fields supported (e.g. <code className="bg-gray-100 px-1 rounded">&quot;Doe, John&quot;</code>)</li>
        </ul>
      </div>
    </div>
  )
}
