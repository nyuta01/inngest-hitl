"use client"

import { useState } from "react"
import { useFeedbackSubmission } from "@/hooks/useFeedbackSubmission"
import type { FeedbackFormProps } from "@/types/research"
import { Alert } from "./alert"

export function FeedbackForm({ event, uuid, schema, onSubmitSuccess }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState("")
  const [approved, setApproved] = useState<boolean | null>(null)
  const { loading, submitted, error, submitFeedback } = useFeedbackSubmission(onSubmitSuccess)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (approved === null) return
    
    // Require feedback when rejecting
    if (approved === false && hasFeedbackField && !feedback.trim()) {
      alert("Please provide feedback when rejecting")
      return
    }

    const payload = {
      uuid,
      approved,
      ...(feedback.trim() && { feedback: feedback.trim() })
    }

    await submitFeedback(event, payload)
  }

  // Check if schema has feedback field
  const hasFeedbackField = schema?.properties?.feedback

  if (submitted) {
    return <Alert type="success" message="Feedback submitted successfully" />
  }

  if (error) {
    return <Alert type="error" message={error} />
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <div className="flex space-x-2">
        <button
          type="button"
          onClick={() => setApproved(true)}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            approved === true
              ? "bg-green-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
          disabled={loading}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setApproved(false)}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            approved === false
              ? "bg-red-600 text-white"
              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
          disabled={loading}
        >
          Reject
        </button>
      </div>

      {hasFeedbackField && approved === false && (
        <div>
          <label htmlFor={`feedback-${uuid}`} className="block text-xs font-medium mb-1">
            Feedback {schema?.properties?.feedback?.description && `(${schema.properties.feedback.description})`}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <textarea
            id={`feedback-${uuid}`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Please provide feedback for rejection..."
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            disabled={loading}
            required={approved === false}
          />
        </div>
      )}

      {approved !== null && (
        <button
          type="submit"
          disabled={loading}
          className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send Feedback"}
        </button>
      )}
    </form>
  )
}