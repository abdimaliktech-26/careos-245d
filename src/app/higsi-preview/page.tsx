'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  LayoutDashboard, Users, FolderKanban, FileText, ShieldCheck, ListChecks,
  BarChart3, UsersRound, Settings, Search, Bell, ChevronDown, ChevronRight,
  TrendingUp, ClipboardList, AlertTriangle, FileWarning, Clock, CalendarClock,
} from 'lucide-react'
import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart,
} from 'recharts'

/* ---- Design tokens (your exact system) ---- */
const C = {
  navy: '#001F5B', emerald: '#10B99A', white: '#FFFFFF', lightBg: '#F8FAFC',
  border: '#E2E8F0', text: '#0F172A', textSub: '#64748B', warn: '#F59E0B',
  danger: '#EF4444', blue: '#3B82F6',
}

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Clients', icon: Users },
  { label: 'Programs', icon: FolderKanban },
  { label: 'Documents', icon: FileText },
  { label: 'Compliance', icon: ShieldCheck },
  { label: 'Tasks', icon: ListChecks },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Team', icon: UsersRound },
  { label: 'Settings', icon: Settings },
]

const COMPLIANCE = [
  { m: 'Jan', score: 88 }, { m: 'Feb', score: 90 }, { m: 'Mar', score: 87 },
  { m: 'Apr', score: 92 }, { m: 'May', score: 94 }, { m: 'Jun', score: 96 },
]

const CLIENTS = [
  { name: 'Aaliyah Hassan', program: 'ICS · CADI', county: 'Hennepin', status: 'Active', score: 98 },
  { name: 'Marcus Johnson', program: 'ICLS · DD', county: 'Ramsey', status: 'Review', score: 84 },
  { name: 'Sofia Ramirez', program: 'Day Services · BI', county: 'Dakota', status: 'Active', score: 91 },
  { name: 'David Okafor', program: 'ICS · CADI', county: 'Anoka', status: 'Active', score: 95 },
  { name: 'Leah Nguyen', program: 'ICLS · DD', county: 'Washington', status: 'At risk', score: 72 },
]

const TASKS = [
  { t: 'Annual review — Aaliyah Hassan', due: 'Today', sev: 'danger' },
  { t: '45-day review — Marcus Johnson', due: 'In 2 days', sev: 'warn' },
  { t: 'Signature needed — Sofia Ramirez', due: 'In 4 days', sev: 'blue' },
  { t: 'Staff training expiring — D. Okafor', due: 'In 6 days', sev: 'warn' },
]

const REMINDERS = [
  { t: 'EVV exceptions to resolve', meta: '3 visits flagged this week' },
  { t: 'Documents missing signatures', meta: '5 packets pending' },
  { t: 'Quarterly compliance export', meta: 'Due end of month' },
]

const ACTIVITY = [
  { who: 'Demo Admin', what: 'approved EVV visit', when: '12m ago', dot: C.emerald },
  { who: 'Sofia R.', what: 'signed intake packet', when: '40m ago', dot: C.blue },
  { who: 'System', what: 'flagged geofence exception', when: '1h ago', dot: C.warn },
  { who: 'Demo Admin', what: 'created service plan', when: '2h ago', dot: C.emerald },
  { who: 'Marcus J.', what: 'updated health record', when: '3h ago', dot: C.blue },
]

function Kpi({ label, value, delta, icon: Icon, tint }: { label: string; value: string; delta: string; icon: typeof Users; tint: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5" style={{ borderColor: C.border, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${tint}1A`, color: tint }}>
          <Icon size={20} />
        </div>
        <span className="text-[12px] font-semibold" style={{ color: C.emerald }}>{delta}</span>
      </div>
      <p className="mt-4 text-[28px] font-bold leading-none" style={{ color: C.text }}>{value}</p>
      <p className="mt-1.5 text-[13px]" style={{ color: C.textSub }}>{label}</p>
    </div>
  )
}

function SeverityDot({ sev }: { sev: string }) {
  const color = sev === 'danger' ? C.danger : sev === 'warn' ? C.warn : C.blue
  return <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
}

export default function HigsiPreview() {
  const [org, setOrg] = useState('Platform Admin')

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: C.lightBg, color: C.text }}>
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col" style={{ backgroundColor: C.navy }}>
        <div className="px-5 py-5">
          <div className="inline-flex items-center rounded-xl bg-white px-3 py-2">
            <Image src="/higsi-logo.png" alt="Higsi" width={104} height={34} className="h-7 w-auto" />
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-medium transition-colors"
              style={
                active
                  ? { background: `linear-gradient(135deg, ${C.emerald}, #0E9E86)`, color: C.white, boxShadow: '0 6px 16px rgba(16,185,154,0.35)' }
                  : { color: '#A9B4CC' }
              }
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        {/* User profile card */}
        <div className="m-3 rounded-2xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.emerald}, ${C.blue})` }}>HA</div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">Demo Admin</p>
              <p className="truncate text-[11px]" style={{ color: '#8E9AB5' }}>Org Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="ml-64 flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b bg-white px-8 py-3.5" style={{ borderColor: C.border }}>
          <div className="relative mx-auto w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textSub }} />
            <input
              placeholder="Search clients, documents, tasks…"
              className="w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-transparent"
              style={{ borderColor: C.border }}
            />
          </div>
          <button className="relative flex h-9 w-9 items-center justify-center rounded-xl border" style={{ borderColor: C.border, color: C.textSub }}>
            <Bell size={17} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full" style={{ backgroundColor: C.danger }} />
          </button>
          <button onClick={() => setOrg(org === 'Platform Admin' ? 'Stillwater Care' : 'Platform Admin')} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium" style={{ borderColor: C.border, color: C.text }}>
            {org} <ChevronDown size={15} style={{ color: C.textSub }} />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.blue})` }}>DA</div>
        </header>

        {/* Content */}
        <main className="px-8 py-7">
          <div className="mb-6">
            <h1 className="text-[22px] font-bold" style={{ color: C.text }}>Good morning, Demo</h1>
            <p className="mt-1 text-[13.5px]" style={{ color: C.textSub }}>Here&apos;s your compliance overview for today.</p>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Total Clients" value="128" delta="+6 this month" icon={Users} tint={C.blue} />
            <Kpi label="Compliance Score" value="96%" delta="+2.4%" icon={ShieldCheck} tint={C.emerald} />
            <Kpi label="Tasks Due" value="14" delta="4 urgent" icon={ListChecks} tint={C.warn} />
            <Kpi label="Documents Missing" value="5" delta="needs action" icon={FileWarning} tint={C.danger} />
          </div>

          {/* Chart + side cards */}
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            {/* Compliance chart */}
            <div className="rounded-2xl border bg-white p-6 xl:col-span-2" style={{ borderColor: C.border, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-[15px] font-semibold" style={{ color: C.text }}>Compliance Overview</h2>
                  <p className="text-[12.5px]" style={{ color: C.textSub }}>Six-month trend</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ backgroundColor: `${C.emerald}1A`, color: C.emerald }}>
                  <TrendingUp size={13} /> +8% YoY
                </span>
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={COMPLIANCE} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.emerald} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={C.emerald} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: C.textSub }} axisLine={false} tickLine={false} />
                    <YAxis domain={[70, 100]} tick={{ fontSize: 12, fill: C.textSub }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 12 }} />
                    <Area type="monotone" dataKey="score" stroke={C.emerald} strokeWidth={2.5} fill="url(#g)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tasks Due + Reminders */}
            <div className="space-y-5">
              <div className="rounded-2xl border bg-white p-6" style={{ borderColor: C.border, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                <div className="mb-3 flex items-center gap-2">
                  <ClipboardList size={16} style={{ color: C.navy }} />
                  <h2 className="text-[15px] font-semibold" style={{ color: C.text }}>Tasks Due</h2>
                </div>
                <ul className="space-y-3">
                  {TASKS.map((task) => (
                    <li key={task.t} className="flex items-start gap-2.5">
                      <SeverityDot sev={task.sev} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-snug" style={{ color: C.text }}>{task.t}</p>
                        <p className="text-[11.5px]" style={{ color: C.textSub }}>{task.due}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border bg-white p-6" style={{ borderColor: C.border, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                <div className="mb-3 flex items-center gap-2">
                  <CalendarClock size={16} style={{ color: C.navy }} />
                  <h2 className="text-[15px] font-semibold" style={{ color: C.text }}>Reminders</h2>
                </div>
                <ul className="space-y-3">
                  {REMINDERS.map((r) => (
                    <li key={r.t} className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${C.warn}1A`, color: C.warn }}><AlertTriangle size={13} /></span>
                      <div>
                        <p className="text-[13px] font-medium leading-snug" style={{ color: C.text }}>{r.t}</p>
                        <p className="text-[11.5px]" style={{ color: C.textSub }}>{r.meta}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Recent clients + activity */}
          <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="overflow-hidden rounded-2xl border bg-white xl:col-span-2" style={{ borderColor: C.border, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
              <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: C.border }}>
                <h2 className="text-[15px] font-semibold" style={{ color: C.text }}>Recent Clients</h2>
                <button className="inline-flex items-center gap-1 text-[12.5px] font-semibold" style={{ color: C.emerald }}>View all <ChevronRight size={14} /></button>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: C.lightBg }}>
                    {['Client', 'Program', 'County', 'Status', 'Score'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.textSub }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CLIENTS.map((c) => {
                    const statusColor = c.status === 'At risk' ? C.danger : c.status === 'Review' ? C.warn : C.emerald
                    return (
                      <tr key={c.name} className="border-t" style={{ borderColor: C.border }}>
                        <td className="px-6 py-3.5 text-[13px] font-medium" style={{ color: C.text }}>{c.name}</td>
                        <td className="px-6 py-3.5 text-[12.5px]" style={{ color: C.textSub }}>{c.program}</td>
                        <td className="px-6 py-3.5 text-[12.5px]" style={{ color: C.textSub }}>{c.county}</td>
                        <td className="px-6 py-3.5">
                          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: `${statusColor}1A`, color: statusColor }}>{c.status}</span>
                        </td>
                        <td className="px-6 py-3.5 text-[13px] font-semibold" style={{ color: c.score < 80 ? C.danger : C.text }}>{c.score}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Activity */}
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: C.border, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
              <h2 className="mb-4 text-[15px] font-semibold" style={{ color: C.text }}>Recent Activity</h2>
              <ol className="relative space-y-4">
                {ACTIVITY.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.dot }} />
                    <div>
                      <p className="text-[13px] leading-snug" style={{ color: C.text }}>
                        <span className="font-semibold">{a.who}</span> {a.what}
                      </p>
                      <p className="flex items-center gap-1 text-[11.5px]" style={{ color: C.textSub }}><Clock size={11} /> {a.when}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p className="mt-8 text-center text-[11px]" style={{ color: C.textSub }}>Design preview · mock data · Higsi 245D Suite</p>
        </main>
      </div>
    </div>
  )
}
