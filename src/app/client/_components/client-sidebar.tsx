'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { UserProfile } from '@/types/app'

interface ClientSidebarProps {
  user: UserProfile
}

function HomeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}

function FileIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function LogsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

const NAV_ITEMS = [
  { href: '/client', label: 'Dashboard', icon: HomeIcon },
  { href: '/client/documents', label: 'Documents', icon: FileIcon },
  { href: '/client/messages', label: 'Messages', icon: MessageIcon },
  { href: '/client/schedule', label: 'Schedule', icon: CalendarIcon },
  { href: '/client/service-logs', label: 'Service Logs', icon: LogsIcon },
  { href: '/client/profile', label: 'Profile', icon: UserIcon },
]

function NavItem({ href, label, Icon, active }: { href: string; label: string; Icon: React.FC; active: boolean }) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
        active
          ? 'bg-[#EEF2FF] text-[#E8799E] font-semibold'
          : 'text-[#64748B] hover:bg-gray-50 hover:text-[#334155]'
      }`}
    >
      {active && (
        <span className="absolute left-0 inset-y-1.5 w-0.5 rounded-r-full bg-[#E8799E]" />
      )}
      <span className={`shrink-0 transition-colors ${active ? 'text-[#E8799E]' : 'text-[#94A3B8] group-hover:text-[#64748B]'}`}>
        <Icon />
      </span>
      <span className="truncate">{label}</span>
    </Link>
  )
}

export default function ClientSidebar({ user }: ClientSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()

  const roleLabel = user.role.replace(/_/g, ' ')

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100/80">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-[10px] shrink-0"
          style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
        >
          <svg width="15" height="15" viewBox="0 0 20 20" fill="white">
            <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-bold leading-none tracking-tight text-[#3A2A4A]">CareIntake</p>
          <p className="mt-0.5 text-[9px] font-semibold tracking-[0.14em] text-[#E8799E] uppercase">Client Portal</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-1.5 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#CBD5E1]">Menu</p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              Icon={Icon}
              active={pathname === href || (href !== '/client' && pathname.startsWith(href))}
            />
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 rounded-xl bg-[#F8FAFC] px-3 py-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#3A2A4A] truncate leading-tight">{user.fullName}</p>
            <p className="text-[10px] text-[#94A3B8] capitalize leading-tight mt-0.5">{roleLabel}</p>
          </div>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              title="Sign out"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#CBD5E1] transition-colors hover:bg-gray-200 hover:text-[#64748B]"
            >
              <LogoutIcon />
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-[8px]"
            style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="white">
              <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-[13px] font-bold text-[#3A2A4A]">CareIntake</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#64748B] hover:bg-gray-100"
        >
          {mobileOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-[232px] lg:shrink-0 h-screen border-r border-gray-100 bg-white overflow-hidden">
        {sidebarContent}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-white shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
