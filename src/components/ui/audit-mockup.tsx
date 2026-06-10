export function AuditMockup() {
  return (
    <div className="overflow-hidden rounded-2xl bg-[#F0F4FF]" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 bg-white px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className="ml-3 text-[10px] text-gray-400">CareIntake — AI Audit Assistant</span>
      </div>

      {/* App shell */}
      <div className="flex h-[380px]">
        {/* Sidebar */}
        <div className="flex w-[168px] shrink-0 flex-col border-r border-gray-100 bg-white p-3">
          <div className="mb-3 flex items-center gap-2 px-2 py-1.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
            >
              <svg width="11" height="11" viewBox="0 0 20 20" fill="white">
                <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-[11px] font-bold text-[#3A2A4A]">CareIntake</span>
          </div>

          {[
            { label: 'Dashboard', active: false },
            { label: 'Clients', active: false },
            { label: 'Packets', active: false },
            { label: 'Audit', active: true },
            { label: 'Billing', active: false },
          ].map(({ label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${active ? 'bg-[#EEF2FF]' : ''}`}
            >
              <div className={`h-2.5 w-2.5 rounded-sm ${active ? 'bg-[#E8799E]' : 'bg-gray-200'}`} />
              <span className={`text-[10px] ${active ? 'font-semibold text-[#E8799E]' : 'text-[#64748B]'}`}>{label}</span>
            </div>
          ))}
        </div>

        {/* Main */}
        <div className="flex-1 overflow-hidden p-4">
          {/* Header row */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-[#94A3B8]">AI Audit Assistant</p>
              <p className="text-[13px] font-bold text-[#3A2A4A]">Compliance Readiness</p>
            </div>
            {/* Readiness score */}
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-center">
              <p className="text-[16px] font-bold text-emerald-600">87</p>
              <p className="text-[7px] font-semibold uppercase tracking-wide text-emerald-500">Score</p>
            </div>
          </div>

          {/* Severity chips */}
          <div className="mb-3 grid grid-cols-4 gap-1.5">
            {[
              { label: 'Critical', val: '0', cls: 'border-red-100 bg-red-50 text-red-700' },
              { label: 'High', val: '1', cls: 'border-orange-100 bg-orange-50 text-orange-700' },
              { label: 'Medium', val: '3', cls: 'border-amber-100 bg-amber-50 text-amber-700' },
              { label: 'Low', val: '2', cls: 'border-blue-100 bg-blue-50 text-blue-700' },
            ].map(({ label, val, cls }) => (
              <div key={label} className={`rounded-xl border p-2 text-center ${cls}`}>
                <p className="text-[13px] font-bold">{val}</p>
                <p className="text-[7px] font-semibold uppercase tracking-wide">{label}</p>
              </div>
            ))}
          </div>

          {/* Findings */}
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <div className="border-b border-gray-50 px-3 py-2">
              <p className="text-[9px] font-semibold text-[#3A2A4A]">Findings</p>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { title: 'Jordan M. — Annual overdue', tag: 'Packets', tagCls: 'bg-[#EEF2FF] text-[#E8799E]', sev: 'High', sevCls: 'bg-orange-50 text-orange-700' },
                { title: 'Missing BSN on file', tag: 'Documents', tagCls: 'bg-[#EEF2FF] text-[#E8799E]', sev: 'Medium', sevCls: 'bg-amber-50 text-amber-700' },
                { title: 'CPR cert expires in 7 days', tag: 'Training', tagCls: 'bg-[#EEF2FF] text-[#E8799E]', sev: 'Medium', sevCls: 'bg-amber-50 text-amber-700' },
                { title: '2 EVV visits unverified', tag: 'EVV', tagCls: 'bg-[#EEF2FF] text-[#E8799E]', sev: 'Low', sevCls: 'bg-blue-50 text-blue-700' },
              ].map((f) => (
                <div key={f.title} className="flex items-center gap-2 px-3 py-2">
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-bold ${f.sevCls}`}>{f.sev}</span>
                  <span className="flex-1 text-[9px] font-medium text-[#3A2A4A] truncate">{f.title}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-semibold ${f.tagCls}`}>{f.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
