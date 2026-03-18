import { useCallback, useRef, useState } from "react"
import { encodeWav } from "@/lib/wav"

const SILENCE_THRESHOLD = 0.015
const SILENCE_DURATION_MS = 1500
const SPEECH_CONFIRM_FRAMES = 5
const MIN_RECORD_MS = 500

export function useInterviewAudio() {
  const [level, setLevel] = useState(0)
  
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const workletRef = useRef<ScriptProcessorNode | null>(null)
  const samplesRef = useRef<Float32Array[]>([])
  
  const wsRef = useRef<WebSocket | null>(null)

  const silenceStartRef = useRef(0)
  const speechFramesRef = useRef(0)
  const isRecordingRef = useRef(false)
  const recordStartRef = useRef(0)
  const rafRef = useRef(0)
  const isListeningRef = useRef(false)

  // Audio Playback refs
  const audioQueueRef = useRef<HTMLAudioElement[]>([])
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)
  const playbackBatchRef = useRef<Uint8Array[]>([])

  const initMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
    })
    const ctx = new AudioContext({ sampleRate: 16000 })
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    source.connect(analyser)

    const processor = ctx.createScriptProcessor(4096, 1, 1)
    source.connect(processor)
    processor.connect(ctx.destination)

    processor.onaudioprocess = (e) => {
      if (!isRecordingRef.current) return
      samplesRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)))
    }

    audioCtxRef.current = ctx
    streamRef.current = stream
    analyserRef.current = analyser
    workletRef.current = processor
  }, [])

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    isListeningRef.current = false
    workletRef.current?.disconnect()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()
    if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
    }
    audioCtxRef.current = null
    streamRef.current = null
    analyserRef.current = null
    workletRef.current = null
    
    audioQueueRef.current.forEach(a => URL.revokeObjectURL(a.src))
    audioQueueRef.current = []
    if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        URL.revokeObjectURL(currentAudioRef.current.src)
        currentAudioRef.current = null
    }
  }, [])

  const startListening = useCallback(
    (onListening: () => void, onRecording: () => void, onFinish: () => void) => {
      isListeningRef.current = true
      isRecordingRef.current = false
      samplesRef.current = []
      silenceStartRef.current = 0
      speechFramesRef.current = 0
      onListening()

      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume()
      }

      const analyser = analyserRef.current
      if (!analyser) return
      const buf = new Float32Array(analyser.fftSize)

      const tick = () => {
        if (!isListeningRef.current) return
        
        analyser.getFloatTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
        const rms = Math.sqrt(sum / buf.length)
        setLevel(rms)

        const now = Date.now()
        const isSpeech = rms > SILENCE_THRESHOLD

        if (!isRecordingRef.current) {
          if (isSpeech) {
            speechFramesRef.current++
            if (speechFramesRef.current >= SPEECH_CONFIRM_FRAMES) {
              isRecordingRef.current = true
              recordStartRef.current = now
              samplesRef.current = []
              onRecording()
            }
          } else {
            speechFramesRef.current = 0
          }
        } else {
          if (!isSpeech) {
            if (silenceStartRef.current === 0) silenceStartRef.current = now
            else if (
              now - silenceStartRef.current >= SILENCE_DURATION_MS &&
              now - recordStartRef.current >= MIN_RECORD_MS
            ) {
              isRecordingRef.current = false
              isListeningRef.current = false
              onFinish()
              return
            }
          } else {
            silenceStartRef.current = 0
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    []
  )

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    isRecordingRef.current = false
    cancelAnimationFrame(rafRef.current)
  }, [])

  const getRecordedAudio = useCallback((): Blob | null => {
    const chunks = samplesRef.current
    if (chunks.length === 0) return null

    const totalLen = chunks.reduce((a, c) => a + c.length, 0)
    const merged = new Float32Array(totalLen)
    let offset = 0
    for (const c of chunks) {
      merged.set(c, offset)
      offset += c.length
    }
    samplesRef.current = []

    const ctx = audioCtxRef.current
    return encodeWav(merged, ctx?.sampleRate ?? 16000)
  }, [])

  const onPlaybackCompleteRef = useRef<(() => void) | null>(null)

  const flushPlaybackBatch = useCallback(() => {
    if (playbackBatchRef.current.length === 0) return
    const blob = new Blob(playbackBatchRef.current as BlobPart[], { type: "audio/mpeg" })
    playbackBatchRef.current = []

    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.preload = "auto"
    audio.load()

    const playNext = () => {
        if (audioQueueRef.current.length === 0) {
            onPlaybackCompleteRef.current?.()
            return
        }
        const next = audioQueueRef.current.shift()!
        currentAudioRef.current = next
        
        next.onended = () => {
            URL.revokeObjectURL(next.src)
            playNext()
        }
        next.onerror = () => {
            URL.revokeObjectURL(next.src)
            playNext()
        }
        next.play().catch(() => {
            URL.revokeObjectURL(next.src)
            playNext()
        })
    }

    if (!currentAudioRef.current || currentAudioRef.current.ended) {
        currentAudioRef.current = audio
        audio.onended = () => {
            URL.revokeObjectURL(audio.src)
            playNext()
        }
        audio.onerror = () => {
            URL.revokeObjectURL(audio.src)
            playNext()
        }
        audio.play().catch(() => {
            URL.revokeObjectURL(audio.src)
            playNext()
        })
    } else {
        audioQueueRef.current.push(audio)
    }
  }, [])

  // Callbacks interface matching what page.tsx expects
  const connectWebSocket = useCallback((
    sessionId: string,
    callbacks: {
        onGreetingComplete: (text: string, phase: string) => void,
        onTranscript: (text: string) => void,
        onReplyComplete: (text: string, phase: string, shouldEnd: boolean) => void,
        onError: (err: string) => void,
        onPlaybackComplete: () => void
    }
  ) => {
    onPlaybackCompleteRef.current = callbacks.onPlaybackComplete
    let baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin
    baseUrl = baseUrl.replace(/^http/, 'ws')
    const ws = new WebSocket(`${baseUrl}/api/interviews/${sessionId}/ws`)
    ws.binaryType = "arraybuffer"

    ws.onmessage = async (e) => {
      if (typeof e.data === "string") {
         const msg = JSON.parse(e.data)
         if (msg.type === "control") {
             if (msg.event === "greeting_complete") {
                 flushPlaybackBatch()
                 callbacks.onGreetingComplete(msg.text, msg.phase)
             } else if (msg.event === "transcript") {
                 callbacks.onTranscript(msg.text)
             } else if (msg.event === "reply_complete") {
                 flushPlaybackBatch()
                 callbacks.onReplyComplete(msg.text, msg.phase, msg.should_end)
             }
         }
      } else {
         // Binary MP3 partial chunk stream
         playbackBatchRef.current.push(new Uint8Array(e.data))
         if (playbackBatchRef.current.length >= 10) {
             flushPlaybackBatch()
         }
      }
    }

    ws.onerror = (e) => {
        callbacks.onError("WebSocket error occurred")
    }
    
    wsRef.current = ws
  }, [flushPlaybackBatch])

  const sendAudioWs = useCallback((blob: Blob) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(blob)
          wsRef.current.send(JSON.stringify({ type: "event", event: "eos" }))
      }
  }, [])

  return {
    level,
    setLevel,
    initMic,
    cleanup,
    startListening,
    stopListening,
    getRecordedAudio,
    connectWebSocket,
    sendAudioWs,
  }
}
