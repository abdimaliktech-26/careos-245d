'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { OrgBranding } from '@/types/app'

export default function MobileSidebar({ children, branding }: { children: React.ReactNode; branding?: OrgBranding | null }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden shrink-0">
        <div className="flex items-center gap-2">
          {branding?.logo_url ? (
            <>
              <Image src={branding.logo_url} alt="" width={28} height={28} unoptimized className="h-7 w-7 rounded-[8px] object-contain border border-border" />
              <span className="text-[13px] font-bold text-foreground">{branding.name ?? 'Higsi'}</span>
            </>
          ) : (
            <Image src="/higsi-logo.png" alt="Higsi" width={72} height={24} className="h-6 w-auto" />
          )}
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label={open ? 'Close sidebar' : 'Open sidebar'}
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Desktop — render children as-is */}
      <div className="hidden lg:flex lg:flex-col lg:w-[232px] lg:shrink-0 h-screen border-r border-border bg-card overflow-hidden">
        {children}
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/20 transition-opacity duration-300"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-card shadow-xl animate-in-slide-left">
            {children}
          </div>
        </div>
      )}
    </>
  )
}
