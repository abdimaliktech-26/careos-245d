'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechRecognitionInstance = {
  abort: () => void
  start: () => void
  stop: () => void
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onerror: ((e: SpeechRecognitionError) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionEvent = {
  resultIndex: number
  results: Array<Array<{ transcript: string }> & { isFinal: boolean }>
}

type SpeechRecognitionError = {
  error: string
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

export type VoiceLang = 'en' | 'so'

const LANG_CODE: Record<VoiceLang, string> = {
  en: 'en-US',
  so: 'so-SO',
}

export interface UseVoiceInputOptions {
  lang: VoiceLang
  onResult: (transcript: string, isFinal: boolean) => void
  onEnd?: () => void
  onError?: (msg: string) => void
}

export function useVoiceInput({ lang, onResult, onEnd, onError }: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const recRef = useRef<SpeechRecognitionInstance | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const SILENCE_TIMEOUT_MS = 10000

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const Win = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
    const SR = Win.SpeechRecognition || Win.webkitSpeechRecognition
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsSupported(!!SR)
  }, [])

  const stop = useCallback(() => {
    clearSilenceTimer()
    recRef.current?.stop()
    setIsListening(false)
  }, [clearSilenceTimer])

  const start = useCallback(() => {
    const Win = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor }
    const SR = Win.SpeechRecognition || Win.webkitSpeechRecognition
    if (!SR) return

    const rec = new SR()
    rec.lang = LANG_CODE[lang]
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.continuous = false

    rec.onresult = (e) => {
      clearSilenceTimer()
      silenceTimerRef.current = setTimeout(() => {
        stop()
        onError?.('No speech detected for a while. Microphone stopped.')
      }, SILENCE_TIMEOUT_MS)

      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript
        if (e.results[i].isFinal) final += text
        else interim += text
      }
      if (final)  onResult(final, true)
      else if (interim) onResult(interim, false)
    }

    silenceTimerRef.current = setTimeout(() => {
      rec.stop()
      onError?.('No speech detected. Microphone stopped.')
    }, SILENCE_TIMEOUT_MS)

    rec.onerror = (e) => {
      clearSilenceTimer()
      setIsListening(false)
      const msgs: Record<string, string> = {
        'not-allowed':  'Microphone permission denied.',
        'no-speech':    'No speech detected. Try again.',
        'network':      'Network error — check your connection.',
        'language-not-supported': 'Somali voice not available in this browser. Try Chrome.',
      }
      onError?.(msgs[e.error] ?? `Voice error: ${e.error}`)
    }

    rec.onend = () => {
      setIsListening(false)
      onEnd?.()
    }

    recRef.current = rec
    rec.start()
    setIsListening(true)
  }, [lang, onResult, onEnd, onError])

  const toggle = useCallback(() => {
    if (isListening) stop()
    else start()
  }, [isListening, start, stop])

  // Cleanup: clear silence timer on unmount
  useEffect(() => {
    return () => clearSilenceTimer()
  }, [clearSilenceTimer])

  // Stop if lang changes while listening
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isListening) stop()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  return { isListening, isSupported, start, stop, toggle }
}

// TTS helper
export function speakText(text: string, lang: VoiceLang) {
  if (typeof window === 'undefined') return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = LANG_CODE[lang]
  utter.rate = 0.92

  // Pick best available voice for the language
  const voices = window.speechSynthesis.getVoices()
  const match = voices.find((v) => v.lang.startsWith(lang === 'so' ? 'so' : 'en'))
  if (match) utter.voice = match

  window.speechSynthesis.speak(utter)
}

export function stopSpeaking() {
  if (typeof window !== 'undefined') window.speechSynthesis.cancel()
}
