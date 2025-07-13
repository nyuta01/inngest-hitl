import { useState, useCallback } from 'react'

interface FeedbackPayload {
  uuid: string
  approved: boolean
  feedback?: string
}

interface UseFeedbackSubmissionReturn {
  loading: boolean
  submitted: boolean
  error: string | null
  submitFeedback: (event: string, payload: FeedbackPayload) => Promise<void>
  reset: () => void
}

export function useFeedbackSubmission(onSuccess?: () => void): UseFeedbackSubmissionReturn {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitFeedback = useCallback(async (event: string, payload: FeedbackPayload) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/research/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event,
          data: payload
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to send feedback: ${response.statusText}`)
      }

      setSubmitted(true)
      onSuccess?.()
    } catch (err) {
      console.error('Feedback submission error:', err)
      setError(err instanceof Error ? err.message : 'Failed to send feedback')
    } finally {
      setLoading(false)
    }
  }, [onSuccess])

  const reset = useCallback(() => {
    setLoading(false)
    setSubmitted(false)
    setError(null)
  }, [])

  return {
    loading,
    submitted,
    error,
    submitFeedback,
    reset
  }
}