'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useVoiceInput, speakText, stopSpeaking, type VoiceLang } from '@/hooks/use-voice-input'
import { VoiceMicButton } from '@/components/ui/voice-mic-button'

export default function CareAssistChat() {
  const [open, setOpen]           = useState(false)
  const [lang, setLang]           = useState<VoiceLang>('en')
  const [draft, setDraft]         = useState('')
  const [ttsEnabled, setTtsEnabled] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatId = useMemo(() => crypto.randomUUID(), [])

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // Voice input
  const { isListening, isSupported, toggle: toggleMic } = useVoiceInput({
    lang,
    onResult: (transcript, isFinal) => {
      setDraft(transcript)
      setVoiceError(null)
      // Auto-send on final result
      if (isFinal && transcript.trim() && !isLoading) {
        sendMessage({ text: transcript.trim() })
        setDraft('')
      }
    },
    onError: (msg) => setVoiceError(msg),
  })

  // Read aloud when TTS on and streaming finishes
  useEffect(() => {
    if (!ttsEnabled || status !== 'ready') return
    const last = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!last) return
    const text = last.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('') ?? ''
    if (text) speakText(text, lang)
  }, [status, ttsEnabled, messages, lang])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim() || isLoading) return
    stopSpeaking()
    sendMessage({ text: draft.trim() })
    setDraft('')
  }

  function switchLang(l: VoiceLang) {
    setLang(l)
    stopSpeaking()
  }

  const placeholder = lang === 'so'
    ? "Su'aal ka weydii 245D…"
    : 'Ask about 245D compliance…'

  const greeting = lang === 'so'
    ? "Salaam! Waxaan ahay CareAssist. Sideen kuu caawin karaa maanta?"
    : "Hi! I'm CareAssist. How can I help you with 245D compliance today?"

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
        aria-label="Open CareAssist chat"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="white" aria-hidden="true">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[370px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'linear-gradient(135deg, #E8799E 0%, #C8A8E8 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="white" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">CareAssist</p>
                <p className="text-[10px] text-white/60 mt-0.5">245D · EN + Af Soomaali</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* TTS toggle */}
              <button
                onClick={() => { setTtsEnabled((v) => !v); if (ttsEnabled) stopSpeaking() }}
                title={ttsEnabled ? 'Mute voice' : 'Enable voice replies'}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${ttsEnabled ? 'bg-white/25' : 'hover:bg-white/10'}`}
                aria-pressed={ttsEnabled}
              >
                {ttsEnabled ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
                  </svg>
                )}
              </button>

              {/* Language toggle */}
              <div className="flex overflow-hidden rounded-full border border-white/25 text-xs font-semibold">
                {(['en', 'so'] as VoiceLang[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => switchLang(l)}
                    className={`px-3 py-1 transition ${lang === l ? 'bg-white text-[#E8799E]' : 'text-white/70 hover:text-white'}`}
                  >
                    {l === 'en' ? 'EN' : 'SO'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Listening banner */}
          {isListening && (
            <div className="flex items-center gap-2 bg-red-50 border-b border-red-100 px-4 py-2">
              <span className="flex gap-0.5 items-end h-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-red-500 animate-pulse"
                    style={{ height: `${[60, 100, 40, 80, 50][i]}%`, animationDelay: `${i * 80}ms` }}
                  />
                ))}
              </span>
              <p className="text-xs font-semibold text-red-600">
                {lang === 'so' ? 'Waxaa la dhageysanayaa… Af Soomaali' : 'Listening in English…'}
              </p>
              <button
                onClick={toggleMic}
                className="ml-auto text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wide"
              >
                {lang === 'so' ? 'Jooji' : 'Stop'}
              </button>
            </div>
          )}

          {/* Voice error */}
          {voiceError && (
            <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 text-xs text-orange-700 font-medium flex items-center justify-between">
              {voiceError}
              <button onClick={() => setVoiceError(null)} className="ml-2 text-orange-400 hover:text-orange-600">✕</button>
            </div>
          )}

          {/* Messages */}
          <div className="flex flex-col gap-3 overflow-y-auto p-4" style={{ height: '360px' }}>
            {/* Greeting */}
            <div className="flex gap-2">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}>
                AI
              </div>
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-gray-100 px-3 py-2 text-sm text-gray-800">
                {greeting}
              </div>
            </div>

            {messages.map((m) => {
              const text = m.parts
                ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                .map((p) => p.text)
                .join('') ?? ''
              return (
                <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'assistant' && (
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}>
                      AI
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'rounded-tr-sm text-white'
                        : 'rounded-tl-sm bg-gray-100 text-gray-800'
                    }`}
                    style={m.role === 'user' ? { background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' } : undefined}
                  >
                    {text}
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}>
                  AI
                </div>
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3">
                  {[0, 150, 300].map((d) => (
                    <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-center text-xs text-red-500">Something went wrong. Try again.</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input row */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-gray-100 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={isListening ? (lang === 'so' ? 'Dhageysanaya…' : 'Listening…') : placeholder}
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#E8799E] focus:ring-2 focus:ring-[#E8799E]/10 transition"
              disabled={isLoading}
            />

            <VoiceMicButton
              isListening={isListening}
              isSupported={isSupported}
              lang={lang}
              onClick={toggleMic}
              size="sm"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading || !draft.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white transition disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #E8799E, #C8A8E8)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}
