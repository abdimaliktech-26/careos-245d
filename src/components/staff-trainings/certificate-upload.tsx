'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function CertificateUpload({ trainingId, onUploaded }: { trainingId: string; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()

    const path = `training-certificates/${trainingId}/${file.name}`
    const { error: uploadErr } = await supabase.storage.from('documents').upload(path, file)
    if (uploadErr) {
      alert(uploadErr.message)
      setUploading(false)
      return
    }

    const { error: docErr } = await supabase.from('documents').insert({
      name: file.name,
      category: 'training_certificate',
      storage_path: path,
      file_type: file.type,
      file_size: file.size,
    }).select('id').single()

    if (docErr) {
      alert(docErr.message)
    } else {
      const { error: linkErr } = await supabase
        .from('staff_trainings')
        .update({ certificate_url: path })
        .eq('id', trainingId)

      if (linkErr) console.error(linkErr)
      onUploaded()
    }

    setUploading(false)
  }

  return (
    <label className="cursor-pointer">
      <span className="text-xs text-primary hover:underline">
        {uploading ? 'Uploading...' : 'Upload Certificate'}
      </span>
      <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleUpload} className="hidden" disabled={uploading} />
    </label>
  )
}
