import { useCallback, useRef, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useSeamlessAudio } from "./useSeamlessAudio"
import type { SentimentMeta } from "@/lib/api"

const SILENCE_THRESHOLD = 0.015
const BARGE_CONFIRM_FRAMES = 3
const TARGET_SAMPLE_RATE = 16000

const SPEAKING_INDICATOR_ON_FRAMES = 2
const SPEAKING_INDICATOR_OFF_FRAMES = 8

function downsampleTo16k(buffer: Float32Array, inRate: number): Float32Array {
  if (inRate === TARGET_SAMPLE_RATE) return buffer
  const ratio = inRate / TARGET_SAMPLE_RATE
  const outLength = Math.floor(buffer.length / ratio)
  const out = new Float32Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const srcPos = i * ratio
    const i0 = Math.floor(srcPos)
    const i1 = Math.min(i0 + 1, buffer.length - 1)
    const frac = srcPos - i0
    out[i] = buffer[i0] * (1 - frac) + buffer[i1] * frac
  }
  return out
}

function floatToPcm16(float32: Float32Array): ArrayBuffer {
  const out = new ArrayBuffer(float32.length * 2)
  const view = new DataView(out)
  for (let i = 0; i < float32.length; i++) {
    let s = Math.max(-1, Math.min(1, float32[i]))
    s = s < 0 ? s * 0x8000 : s * 0x7fff
    view.setInt16(i * 2, s, true)
  }
  return out
}

export function useInterviewAudio() {
  const { getToken } = useAuth()
  const [level, setLevel] = useState(0)
  const [isUserSpeaking, setIsUserSpeaking] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const streamingRef = useRef(false)
  const bargeFramesRef = useRef(0)
  const speakingOnFramesRef = useRef(0)
  const speakingOffFramesRef = useRef(0)
  const isUserSpeakingRef = useRef(false)

  const setSpeakingIndicator = useCallback((value: boolean) => {
    if (isUserSpeakingRef.current !== value) {
      isUserSpeakingRef.current = value
      setIsUserSpeaking(value)
    }
  }, [])

  const onPlaybackStartRef = useRef<(() => void) | null>(null)
  const onPlaybackCompleteRef = useRef<(() => void) | null>(null)

  const seamlessAudio = useSeamlessAudio(
    () => onPlaybackStartRef.current?.(),
    () => onPlaybackCompleteRef.current?.()
  )

  const initMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: TARGET_SAMPLE_RATE },
    })
    const ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE })
    const source = ctx.createMediaStreamSource(stream)
    const processor = ctx.createScriptProcessor(4096, 1, 1)
    source.connect(processor)
    processor.connect(ctx.destination)

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0)

      let sum = 0
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i]
      const rms = Math.sqrt(sum / input.length)
      setLevel(rms)

      if (!streamingRef.current) return
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return

      const speaking = rms > SILENCE_THRESHOLD

      if (seamlessAudio.isPlaying()) {
        if (speaking) {
          bargeFramesRef.current++
          if (bargeFramesRef.current >= BARGE_CONFIRM_FRAMES) {
            bargeFramesRef.current = 0
            try { ws.send(JSON.stringify({ type: "interrupt" })) } catch {}
            seamlessAudio.stop()
            try { ws.send(JSON.stringify({ type: "speech.start" })) } catch {}
          }
        } else {
          bargeFramesRef.current = 0
        }
        speakingOnFramesRef.current = 0
        speakingOffFramesRef.current = 0
        setSpeakingIndicator(false)
        return
      }
      bargeFramesRef.current = 0

      if (speaking) {
        speakingOnFramesRef.current++
        speakingOffFramesRef.current = 0
        if (speakingOnFramesRef.current >= SPEAKING_INDICATOR_ON_FRAMES) {
          setSpeakingIndicator(true)
        }
      } else {
        speakingOffFramesRef.current++
        speakingOnFramesRef.current = 0
        if (speakingOffFramesRef.current >= SPEAKING_INDICATOR_OFF_FRAMES) {
          setSpeakingIndicator(false)
        }
      }

      const pcm16 = downsampleTo16k(input, ctx.sampleRate)
      try {
        ws.send(floatToPcm16(pcm16))
      } catch {}
    }

    audioCtxRef.current = ctx
    streamRef.current = stream
    processorRef.current = processor
    sourceRef.current = source
  }, [seamlessAudio, setSpeakingIndicator])

  const cleanup = useCallback(() => {
    streamingRef.current = false
    setSpeakingIndicator(false)
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null
      processorRef.current.disconnect()
    }
    sourceRef.current?.disconnect()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    audioCtxRef.current = null
    streamRef.current = null
    processorRef.current = null
    sourceRef.current = null

    seamlessAudio.stop()
  }, [seamlessAudio, setSpeakingIndicator])

  const startListening = useCallback(
    (onListening: () => void, _onRecording?: () => void, _onFinish?: () => void) => {
      streamingRef.current = true
      bargeFramesRef.current = 0
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume()
      }
      onListening()
    },
    []
  )

  const stopListening = useCallback(() => {
    streamingRef.current = false
    setSpeakingIndicator(false)
  }, [setSpeakingIndicator])

  const connectWebSocket = useCallback(async (
    sessionId: string,
    callbacks: {
      onGreetingStart: (text: string, phase: string) => void,
      onGreetingComplete: (phase: string) => void,
      onTranscript: (text: string) => void,
      onInterimTranscript?: (text: string) => void,
      onPartialReply: (chunk: string) => void,
      onReplyComplete: (text: string, phase: string, shouldEnd: boolean, sentiment?: SentimentMeta) => void,
      onError: (err: string) => void,
      onPlaybackStart: () => void,
      onPlaybackComplete: () => void
    }
  ) => {
    onPlaybackCompleteRef.current = callbacks.onPlaybackComplete
    onPlaybackStartRef.current = callbacks.onPlaybackStart

    let baseUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin
    baseUrl = baseUrl.replace(/^http/, 'ws')
    const token = await getToken()
    const url = `${baseUrl}/api/interviews/${sessionId}/ws${token ? `?token=${encodeURIComponent(token)}` : ""}`
    const ws = new WebSocket(url)
    ws.binaryType = "arraybuffer"

    ws.onopen = () => {
      streamingRef.current = true
    }

    ws.onmessage = async (e) => {
      if (typeof e.data === "string") {
        const msg = JSON.parse(e.data)
        if (msg.type !== "control") return
        switch (msg.event) {
          case "session_config":
            seamlessAudio.setSampleRate(msg.sample_rate)
            break
          case "greeting_start":
            callbacks.onGreetingStart(msg.text, msg.phase)
            break
          case "greeting_complete":
            await seamlessAudio.flush()
            callbacks.onGreetingComplete(msg.phase)
            break
          case "transcript":
            callbacks.onTranscript(msg.text)
            break
          case "interim_transcript":
            callbacks.onInterimTranscript?.(msg.text)
            break
          case "text_chunk":
            callbacks.onPartialReply(msg.text)
            break
          case "reply_complete":
            await seamlessAudio.flush()
            callbacks.onReplyComplete(msg.text, msg.phase, msg.should_end, msg.sentiment)
            break
          default:
            break
        }
      } else {
        const chunk = new Uint8Array(e.data)
        await seamlessAudio.enqueueChunk(chunk)
      }
    }

    ws.onerror = () => {
      callbacks.onError("WebSocket error occurred")
    }

    wsRef.current = ws
  }, [seamlessAudio, getToken])

  const sendControl = useCallback((obj: Record<string, unknown>) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify(obj)) } catch {}
    }
  }, [])

  return {
    level,
    setLevel,
    isUserSpeaking,
    initMic,
    cleanup,
    startListening,
    stopListening,
    connectWebSocket,
    sendControl,
  }
}
