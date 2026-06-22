/**
 * Seamless Audio Playback using Web Audio API (raw PCM-16).
 *
 * The backend streams raw little-endian PCM-16 (linear16) chunks over the
 * WebSocket. We convert each chunk to a Float32 AudioBuffer and schedule it
 * with precise timing so chunks play back-to-back with no gaps.
 *
 * Why raw PCM instead of MP3 + decodeAudioData():
 *  - decodeAudioData() is unreliable on *partial* MP3 frames (chunks arriving
 *    mid-frame fail to decode), which caused the jitter/gaps we're fixing.
 *  - PCM needs no decode step, so conversion is instant and lossless, and
 *    every chunk is independently playable.
 *
 * Scheduling strategy (unchanged from the MP3 version):
 *  - Pre-buffer MIN_BUFFER_MS before starting to absorb network jitter.
 *  - Schedule each buffer at max(now + LOOK_AHEAD_MS, nextStartTime) so they
 *    chain seamlessly.
 */

import { useRef, useCallback } from 'react'

interface SeamlessAudioPlayer {
  enqueueChunk: (pcmChunk: Uint8Array) => Promise<void>
  flush: () => Promise<void>
  stop: () => void
  isPlaying: () => boolean
  setSampleRate: (rate: number) => void
}

// Configuration constants
const MIN_BUFFER_MS = 300 // Minimum buffer before starting playback (prevents initial gaps)
const LOOK_AHEAD_MS = 100 // How far ahead to schedule (prevents gaps during playback)
const DEFAULT_SAMPLE_RATE = 22050 // Sarvam linear16 default; overridden via setSampleRate

export function useSeamlessAudio(
  onPlaybackStart?: () => void,
  onPlaybackComplete?: () => void
): SeamlessAudioPlayer {
  const audioContextRef = useRef<AudioContext | null>(null)
  const sampleRateRef = useRef<number>(DEFAULT_SAMPLE_RATE)
  const nextStartTimeRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([])

  const decodedBuffersRef = useRef<AudioBuffer[]>([])
  const hasStartedPlaybackRef = useRef<boolean>(false)
  // Carries a single trailing byte if a chunk ends mid-sample.
  const leftoverByteRef = useRef<number | null>(null)

  // Let the AudioContext run at its native rate; AudioBuffers are created at
  // the PCM sample rate and Web Audio resamples them on playback.
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    return audioContextRef.current
  }, [])

  const setSampleRate = useCallback((rate: number) => {
    if (rate && rate > 0) sampleRateRef.current = rate
  }, [])

  // Calculate total buffered duration
  const getBufferedDuration = useCallback((): number => {
    return decodedBuffersRef.current.reduce((total, buffer) => total + buffer.duration, 0)
  }, [])

  // Schedule all available buffers with precise, gapless timing.
  const scheduleAvailableBuffers = useCallback(() => {
    const ctx = getAudioContext()
    const currentTime = ctx.currentTime

    while (decodedBuffersRef.current.length > 0) {
      const audioBuffer = decodedBuffersRef.current.shift()!

      const source = ctx.createBufferSource()
      source.buffer = audioBuffer
      source.connect(ctx.destination)

      const startTime = Math.max(currentTime + LOOK_AHEAD_MS / 1000, nextStartTimeRef.current)
      source.start(startTime)
      scheduledSourcesRef.current.push(source)

      nextStartTimeRef.current = startTime + audioBuffer.duration

      if (!isPlayingRef.current) {
        isPlayingRef.current = true
        onPlaybackStart?.()
      }

      source.onended = () => {
        const index = scheduledSourcesRef.current.indexOf(source)
        if (index > -1) {
          scheduledSourcesRef.current.splice(index, 1)
        }

        if (
          scheduledSourcesRef.current.length === 0 &&
          decodedBuffersRef.current.length === 0
        ) {
          isPlayingRef.current = false
          hasStartedPlaybackRef.current = false
          nextStartTimeRef.current = 0
          onPlaybackComplete?.()
        }
      }
    }
  }, [getAudioContext, onPlaybackStart, onPlaybackComplete])

  // Convert a raw PCM-16 (little-endian) chunk to a mono Float32 AudioBuffer.
  const pcmToAudioBuffer = useCallback((pcmChunk: Uint8Array): AudioBuffer | null => {
    const ctx = getAudioContext()

    // Stitch any leftover trailing byte from the previous chunk.
    let bytes: Uint8Array = pcmChunk
    if (leftoverByteRef.current !== null) {
      const merged = new Uint8Array(pcmChunk.length + 1)
      merged[0] = leftoverByteRef.current
      merged.set(pcmChunk, 1)
      bytes = merged
      leftoverByteRef.current = null
    }
    // Stash a trailing odd byte for the next chunk.
    if (bytes.length % 2 !== 0) {
      leftoverByteRef.current = bytes[bytes.length - 1]
      bytes = bytes.subarray(0, bytes.length - 1)
    }

    const sampleCount = bytes.length / 2
    if (sampleCount === 0) return null

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const float32 = new Float32Array(sampleCount)
    for (let i = 0; i < sampleCount; i++) {
      const int16 = view.getInt16(i * 2, true) // little-endian
      float32[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff
    }

    const audioBuffer = ctx.createBuffer(1, sampleCount, sampleRateRef.current)
    audioBuffer.copyToChannel(float32, 0)
    return audioBuffer
  }, [getAudioContext])

  // Enqueue a raw PCM-16 chunk for playback.
  const enqueueChunk = useCallback(async (pcmChunk: Uint8Array) => {
    if (pcmChunk.length === 0) return

    let audioBuffer: AudioBuffer | null
    try {
      audioBuffer = pcmToAudioBuffer(pcmChunk)
    } catch (error) {
      console.error('Failed to convert PCM chunk:', error)
      return
    }
    if (!audioBuffer) return

    decodedBuffersRef.current.push(audioBuffer)

    const bufferedDuration = getBufferedDuration()
    if (!hasStartedPlaybackRef.current && bufferedDuration >= MIN_BUFFER_MS / 1000) {
      hasStartedPlaybackRef.current = true
      scheduleAvailableBuffers()
    } else if (hasStartedPlaybackRef.current) {
      scheduleAvailableBuffers()
    }
  }, [pcmToAudioBuffer, getBufferedDuration, scheduleAvailableBuffers])

  // Flush any remaining buffered audio (e.g. on a control-message boundary).
  const flush = useCallback(async () => {
    if (decodedBuffersRef.current.length > 0) {
      hasStartedPlaybackRef.current = true
      scheduleAvailableBuffers()
    }
  }, [scheduleAvailableBuffers])

  // Stop all playback immediately and tear down the context.
  const stop = useCallback(() => {
    scheduledSourcesRef.current.forEach(source => {
      try {
        source.stop()
        source.disconnect()
      } catch {
        // Source may have already stopped
      }
    })
    scheduledSourcesRef.current = []
    decodedBuffersRef.current = []
    leftoverByteRef.current = null
    isPlayingRef.current = false
    hasStartedPlaybackRef.current = false
    nextStartTimeRef.current = 0

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }, [])

  const isPlaying = useCallback(() => {
    return isPlayingRef.current
  }, [])

  return {
    enqueueChunk,
    flush,
    stop,
    isPlaying,
    setSampleRate,
  }
}
