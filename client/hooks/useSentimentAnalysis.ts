import { useState, useCallback } from "react"
import type { StreamMeta } from "@/lib/api"

export interface SentimentData {
  emotion: string
  emotionConfidence: number
  sentiment: string
  speechRateWpm: number
  confidenceScore: number
  flags: string[]
}

export function useSentimentAnalysis() {
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null)

  const updateFromMeta = useCallback((meta: StreamMeta) => {
    if (meta.sentiment) {
      setSentimentData({
        emotion: meta.sentiment.hf_emotion || meta.sentiment.emotion,
        emotionConfidence: meta.sentiment.hf_confidence || 0,
        sentiment: meta.sentiment.sentiment || "neutral",
        speechRateWpm: meta.sentiment.speaking_rate_wpm || 0,
        confidenceScore: meta.sentiment.confidence_score || 50,
        flags: meta.sentiment.flags || [],
      })
    }
  }, [])

  const reset = useCallback(() => {
    setSentimentData(null)
  }, [])

  return {
    sentimentData,
    updateFromMeta,
    reset,
  }
}
