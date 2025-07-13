"use client"

interface ResearchExecution {
  content?: string
  reasoning?: string
}

interface ResearchExecutionDisplayProps {
  execution: ResearchExecution
}

export function ResearchExecutionDisplay({ execution }: ResearchExecutionDisplayProps) {
  return (
    <div className="space-y-4">
      {execution.content && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Research Content</h4>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {execution.content}
            </div>
          </div>
        </div>
      )}

      {execution.reasoning && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Analysis & Reasoning</h4>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{execution.reasoning}</p>
        </div>
      )}
    </div>
  )
}