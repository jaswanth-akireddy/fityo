import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal typing for the Web Speech API (Chrome, Edge, Safari; not Firefox).
interface SRResult { isFinal: boolean; 0: { transcript: string } }
interface SREvent { resultIndex: number; results: ArrayLike<SRResult> }
interface SR {
  lang: string; continuous: boolean; interimResults: boolean
  start(): void; stop(): void; abort(): void
  onresult: ((e: SREvent) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

const SRCtor: (new () => SR) | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).SpeechRecognition ??
       (window as unknown as Record<string, unknown>).webkitSpeechRecognition) as (new () => SR) | undefined
    : undefined

export const speechSupported = !!SRCtor

export function useSpeech(lang: string, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<SR | null>(null)
  const finalText = useRef('')
  const cb = useRef(onFinal)
  cb.current = onFinal

  const stop = useCallback(() => rec.current?.stop(), [])

  const start = useCallback(() => {
    if (!SRCtor) { setError('Voice input is not supported in this browser — try Chrome, Edge or Safari.'); return }
    rec.current?.abort()
    const r = new SRCtor()
    r.lang = lang
    r.continuous = true
    r.interimResults = true
    finalText.current = ''
    setTranscript('')
    setError(null)
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText.current += res[0].transcript + ' '
        else interim += res[0].transcript
      }
      setTranscript((finalText.current + interim).trim())
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      setError(e.error === 'not-allowed' ? 'Microphone permission was denied.' : `Voice error: ${e.error}`)
    }
    r.onend = () => {
      setListening(false)
      const t = finalText.current.trim()
      if (t) cb.current(t)
    }
    rec.current = r
    r.start()
    setListening(true)
  }, [lang])

  useEffect(() => () => rec.current?.abort(), [])

  return { listening, transcript, error, start, stop }
}
