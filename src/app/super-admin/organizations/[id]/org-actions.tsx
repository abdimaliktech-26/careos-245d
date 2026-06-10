'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function OrgActions({ orgId, status }: { orgId: string; status: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(action: 'activate' | 'suspend' | 'pending' | 'delete') {
    if (action === 'delete') {
      const ok = window.confirm('Are you sure you want to delete this organization? This cannot be undone.')
      if (!ok) return
    }

    setLoading(action)

    try {
      const res = await fetch(`/super-admin/api/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? 'Action failed')
        return
      }

      router.refresh()
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {status !== 'active' && (
        <Button onClick={() => handleAction('activate')} loading={loading === 'activate'}>
          Activate
        </Button>
      )}
      {status !== 'suspended' && (
        <Button
          onClick={() => handleAction('suspend')}
          variant="secondary"
          loading={loading === 'suspend'}
        >
          Suspend
        </Button>
      )}
      <Button
        onClick={() => handleAction('delete')}
        variant="danger"
        loading={loading === 'delete'}
      >
        Delete
      </Button>
    </div>
  )
}
