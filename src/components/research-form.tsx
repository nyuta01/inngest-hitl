"use client"

import { useState } from "react"
import { useResearchStream } from "@/hooks/useResearchStream"
import type { ResearchFormProps } from "@/types/research"
import { Alert } from "./alert"
import { Spinner } from "./spinner"

export function ResearchForm({ onMessagesUpdate }: ResearchFormProps) {
  const [theme, setTheme] = useState("")
  const { loading, completed, error, submitResearch } = useResearchStream(onMessagesUpdate)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!theme.trim()) return

    const currentTheme = theme
    setTheme("")
    await submitResearch(currentTheme)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Research Theme
          </label>
          <input
            id="theme"
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g., AI Ethics, Climate Change, Space Exploration..."
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading || !theme.trim()}
          className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <Spinner size="sm" className="-ml-1 mr-2 text-white" />
              Processing...
            </span>
          ) : (
            "Submit Research"
          )}
        </button>
      </form>

      {error && !loading && (
        <Alert type="error" message={error} className="mt-4" />
      )}

      {completed && !loading && !error && (
        <Alert type="success" message="Research process completed!" className="mt-4" />
      )}
    </>
  )
}