'use client'

import type { VoiceLang } from '@/hooks/use-voice-input'

interface VoiceMicButtonProps {
  isListening: boolean
  isSupported: boolean
  lang: VoiceLang
  onClick: () => void
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}

export function VoiceMicButton({
  isListening,
  isSupported,
  lang,
  onClick,
  size = 'md',
  disabled,
  className = '',
}: VoiceMicButtonProps) {
  if (!isSupported) return null

  const sizeClasses = {
    sm: 'h-9 w-9',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  }

  const iconSize = { sm: 14, md: 16, lg: 22 }[size]

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-30" />
          <span className="absolute inline-flex h-3/4 w-3/4 animate-ping rounded-full bg-red-400 opacity-20" style={{ animationDelay: '0.2s' }} />
        </>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={isListening
          ? (lang === 'so' ? 'Jooji dhageysiga' : 'Stop listening')
          : (lang === 'so' ? 'Hadal Af Soomaali' : 'Speak in English')
        }
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop recording' : 'Start voice input'}
        className={`relative z-10 flex shrink-0 items-center justify-center rounded-full transition-all duration-200 disabled:opacity-40 ${sizeClasses[size]} ${
          isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110'
            : 'border border-gray-200 bg-white text-gray-500 hover:border-[#E8799E] hover:text-[#E8799E] hover:shadow-sm'
        }`}
      >
        {isListening ? (
          /* Waveform icon */
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path strokeLinecap="round" d="M9 3v18M6 7v10M3 10v4M12 1v22M15 7v10M18 10v4M21 3v18" />
          </svg>
        ) : (
          /* Mic icon */
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 10a7 7 0 0014 0" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="9" y1="22" x2="15" y2="22" />
          </svg>
        )}
      </button>

      {/* Language indicator pill */}
      {isListening && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow">
          {lang === 'so' ? 'Af Soomaali' : 'English'}
        </span>
      )}
    </div>
  )
}
