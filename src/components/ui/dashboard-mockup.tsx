export function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px] text-gray-400">Higsi — Dashboard</span>
      </div>

      <div className="flex h-[420px]">
        {/* Sidebar */}
        <div className="flex w-[150px] shrink-0 flex-col border-r border-gray-100 bg-white py-3">
          {/* Logo */}
          <div className="mb-3 flex items-center gap-2 px-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #10B99A, #0E9E86)' }}>
              <svg width="11" height="11" viewBox="0 0 20 20" fill="white">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#111827]">Higsi</span>
          </div>

          {/* Nav */}
          {[
            { label: 'Dashboard', active: true },
            { label: 'Clients', active: false },
            { label: 'Intake Packets', active: false },
            { label: 'Reviews', active: false },
            { label: 'Signatures', active: false },
            { label: 'Staff Compliance', active: false },
            { label: 'Documents', active: false },
            { label: 'AI Compliance', active: false, badge: 'New' },
          ].map(({ label, active, badge }) => (
            <div
              key={label}
              className={`relative flex items-center gap-2 px-3 py-1.5 ${active ? 'bg-[#EEF2FF]' : ''}`}
            >
              {active && <div className="absolute inset-y-0 left-0 w-[3px] rounded-r bg-[#10B99A]" />}
              <div className={`h-2 w-2 rounded-sm shrink-0 ${active ? 'bg-[#10B99A]' : 'bg-gray-300'}`} />
              <span className={`text-[9px] truncate ${active ? 'font-semibold text-[#10B99A]' : 'text-[#6B7280]'}`}>{label}</span>
              {badge && (
                <span className="ml-auto rounded-full bg-[#10B99A] px-1 py-0.5 text-[6px] font-bold text-white">{badge}</span>
              )}
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Center column */}
          <div className="flex-1 overflow-hidden p-3">
            {/* Page header */}
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-[12px] font-bold text-[#111827]">Dashboard</p>
                <p className="text-[8px] text-[#6B7280]">Welcome back, Amina. Here&apos;s what&apos;s happening today.</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="rounded-lg border border-gray-100 px-1.5 py-0.5 text-[7px] text-[#6B7280]">May 26 – Jun 8, 2025</div>
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EEF2FF]">
                  <span className="text-[8px] text-[#10B99A]">🔔</span>
                </div>
              </div>
            </div>

            {/* 4 stat cards */}
            <div className="mb-2 grid grid-cols-4 gap-1.5">
              <div className="rounded-xl border border-gray-100 bg-white p-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p className="text-[7px] text-[#6B7280]">Compliance Score</p>
                <p className="text-[15px] font-bold text-emerald-600">94%</p>
                <p className="text-[6px] text-emerald-500">+6% from last month</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p className="text-[7px] text-[#6B7280]">Total Clients</p>
                <p className="text-[15px] font-bold text-[#111827]">128</p>
                <p className="text-[6px] text-[#10B99A]">+12 this month</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p className="text-[7px] text-[#6B7280]">Reviews Due</p>
                <p className="text-[15px] font-bold text-amber-500">14</p>
                <p className="text-[6px] text-[#6B7280]">Due this week</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white p-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <p className="text-[7px] text-[#6B7280]">Missing Signatures</p>
                <p className="text-[15px] font-bold text-red-500">3</p>
                <p className="text-[6px] text-[#6B7280]">Requires attention</p>
              </div>
            </div>

            {/* Compliance overview */}
            <div className="mb-2 rounded-xl border border-gray-100 bg-white p-2.5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <p className="mb-2 text-[9px] font-semibold text-[#111827]">Compliance Overview</p>
              <div className="flex items-center gap-3">
                {/* Donut */}
                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#10B981" strokeWidth="4" strokeDasharray="63 37" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="17 83" strokeDashoffset="-63" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#EF4444" strokeWidth="4" strokeDasharray="8 92" strokeDashoffset="-80" />
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-[10px] font-bold text-[#111827]">128</p>
                    <p className="text-[6px] text-[#6B7280]">Total</p>
                  </div>
                </div>
                {/* Legend */}
                <div className="flex flex-col gap-1">
                  {[
                    { dot: 'bg-emerald-500', label: 'Compliant', val: '92 (72%)' },
                    { dot: 'bg-amber-400', label: 'Due Soon', val: '24 (19%)' },
                    { dot: 'bg-red-500', label: 'Overdue', val: '12 (9%)' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${r.dot}`} />
                      <span className="text-[8px] text-[#6B7280]">{r.label}</span>
                      <span className="ml-1 text-[8px] font-semibold text-[#111827]">{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent activity */}
            <div className="rounded-xl border border-gray-100 bg-white p-2.5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <p className="mb-1.5 text-[9px] font-semibold text-[#111827]">Recent Activity</p>
              <div className="space-y-1">
                {[
                  { label: 'Intake packet completed', sub: 'Client: Ahmed Ibrahim', time: '2h ago' },
                  { label: 'Signature completed', sub: 'Client: Maryan Ali', time: '4h ago' },
                  { label: '45-Day review created', sub: 'Client: Abdi Mohamed', time: '1d ago' },
                ].map((a) => (
                  <div key={a.label} className="flex items-center gap-2">
                    <div className="h-4 w-4 shrink-0 rounded-full bg-[#EEF2FF] flex items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#10B99A]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[8px] font-medium text-[#111827]">{a.label}</p>
                      <p className="text-[7px] text-[#6B7280]">{a.sub}</p>
                    </div>
                    <span className="shrink-0 text-[7px] text-[#9CA3AF]">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-[160px] shrink-0 border-l border-gray-100 p-3">
            {/* AI Compliance Assistant */}
            <div className="mb-2 rounded-xl border border-gray-100 bg-white p-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <p className="mb-1.5 text-[9px] font-semibold text-[#111827]">AI Compliance Assistant</p>
              <div className="space-y-1.5">
                {[
                  { icon: '🔴', text: '3 packets missing signatures', sub: 'Guardian or required party needed' },
                  { icon: '🟠', text: '2 annual reviews overdue', sub: 'Reviews past due date' },
                  { icon: '🟡', text: '5 staff certifications expiring', sub: 'Within the next 30 days' },
                ].map((item) => (
                  <div key={item.text} className="flex gap-1.5">
                    <span className="text-[8px] shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-[7px] font-semibold text-[#111827] leading-tight">{item.text}</p>
                      <p className="text-[6px] text-[#6B7280] leading-tight">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming deadlines */}
            <div className="rounded-xl border border-gray-100 bg-white p-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <p className="mb-1.5 text-[9px] font-semibold text-[#111827]">Upcoming Deadlines</p>
              <div className="space-y-1.5">
                {[
                  { name: 'Ahmed Ibrahim', type: '45-Day Review', days: 'Due in 3 days', color: 'text-red-500' },
                  { name: 'Maryan Ali', type: 'Annual Review', days: 'Due in 7 days', color: 'text-amber-500' },
                  { name: 'Abdi Mohamed', type: 'Semi-Annual', days: 'Due in 10 days', color: 'text-amber-400' },
                  { name: 'Hassan Warsame', type: 'Staff Cert', days: 'Due in 14 days', color: 'text-amber-400' },
                ].map((d) => (
                  <div key={d.name} className="flex flex-col">
                    <p className="text-[8px] font-semibold text-[#111827] leading-tight">{d.type}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[7px] text-[#6B7280]">{d.name}</p>
                      <p className={`text-[7px] font-semibold ${d.color}`}>{d.days}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
