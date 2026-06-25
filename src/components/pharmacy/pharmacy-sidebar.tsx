'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid, Users, PackageCheck, RefreshCw, FolderHeart, MessageSquare, Truck,
} from 'lucide-react'

const ITEMS = [
  { href: '/pharmacy/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/pharmacy/clients', label: 'Clients', icon: Users },
  { href: '/pharmacy/orders', label: 'Orders', icon: PackageCheck },
  { href: '/pharmacy/refills', label: 'Refills', icon: RefreshCw },
  { href: '/pharmacy/documents', label: 'Documents', icon: FolderHeart },
  { href: '/pharmacy/messages', label: 'Messages', icon: MessageSquare },
  { href: '/pharmacy/deliveries', label: 'Deliveries', icon: Truck },
]

export function PharmacySidebar({ pharmacyName }: { pharmacyName: string }) {
  const pathname = usePathname()
  return (
    <div className="flex h-screen w-[230px] shrink-0 flex-col bg-[#001F5B]">
      <div className="border-b border-white/10 px-5 py-5">
        <span className="inline-flex items-center rounded-xl bg-white px-2.5 py-1.5">
          <Image src="/higsi-logo.png" alt="Higsi" width={90} height={30} className="h-6 w-auto" />
        </span>
        <p className="mt-3 text-[12px] font-semibold text-white/70">{pharmacyName}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Pharmacy Portal</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                active ? 'bg-white/10 font-semibold text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
              {label}
            </Link>
          )
        })}
      </nav>
      <form action="/auth/logout" method="POST" className="border-t border-white/10 p-3">
        <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-white/55 hover:bg-white/5 hover:text-white">
          Sign out
        </button>
      </form>
    </div>
  )
}
