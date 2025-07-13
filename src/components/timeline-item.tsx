"use client"

import type { StreamMessage, WaitForEventMessage } from "@/types/research"
import { isWaitForEventMessage, isLogMessage, hasError } from "@/types/research"
import { FeedbackForm } from "./feedback-form"
import { ResearchPlanDisplay } from "./research-plan-display"
import { ResearchExecutionDisplay } from "./research-execution-display"
import { ResearchCompleteDisplay } from "./research-complete-display"

interface TimelineItemProps {
  message: StreamMessage
  isLast: boolean
  onMessageUpdate?: (uuid: string, updates: Partial<WaitForEventMessage>) => void
}

export function TimelineItem({ message, isLast, onMessageUpdate }: TimelineItemProps) {
  const renderFormattedDetails = (details: Record<string, unknown>) => {
    // Check if this is a complete research result (check first)
    if (details.execution && details.plan && details.context) {
      const context = details.context as any
      const plan = details.plan as any
      const execution = details.execution as any
      
      return (
        <ResearchCompleteDisplay 
          theme={context?.request?.theme}
          plan={plan}
          execution={execution}
        />
      )
    }
    
    // Check if this is just a research plan
    if (details.plan && typeof details.plan === 'object' && !details.execution) {
      return <ResearchPlanDisplay plan={details.plan as any} />
    }
    
    // Check if this is just a research execution
    if (details.execution && typeof details.execution === 'object' && !details.plan) {
      return <ResearchExecutionDisplay execution={details.execution as any} />
    }
    
    // Check if details only contains status or error
    if (Object.keys(details).length === 1 && (details.status || details.error)) {
      return null
    }
    
    // Default to JSON display for other details
    return (
      <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-x-auto">
        {JSON.stringify(details, null, 2)}
      </pre>
    )
  }

  const getStatusIcon = () => {
    if (isWaitForEventMessage(message)) {
      if (message.completed) {
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      }
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  }

  const getStatusColor = () => {
    if (isWaitForEventMessage(message)) {
      return message.completed
        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
        : 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
    }
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
  }

  const getLogMessageStyle = () => {
    if (!isLogMessage(message)) return ''
    
    if (message.details?.status === 'completed' || message.message === 'Research completed') {
      return 'p-3 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700'
    }
    if (hasError(message)) {
      return 'p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700'
    }
    return ''
  }

  const getLogMessageTextStyle = () => {
    if (!isLogMessage(message)) return 'text-gray-900 dark:text-gray-100'
    
    if (message.details?.status === 'completed' || message.message === 'Research completed') {
      return 'font-semibold text-green-900 dark:text-green-100'
    }
    if (hasError(message)) {
      return 'font-semibold text-red-900 dark:text-red-100'
    }
    return 'text-gray-900 dark:text-gray-100'
  }

  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
      )}
      
      <div className="flex gap-3">
        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          {isLogMessage(message) ? (
            <div className={getLogMessageStyle()}>
              <p className={`text-sm ${getLogMessageTextStyle()}`}>
                {message.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date(message.timestamp).toLocaleString()}
              </p>
              {message.message === 'Research completed' && message.details && Object.keys(message.details).length > 0 && (
                <div className="mt-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Research Summary</h3>
                  <div className="p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 max-h-[300px] overflow-y-auto">
                    {renderFormattedDetails(message.details)}
                  </div>
                </div>
              )}
              {message.details && Object.keys(message.details).length > 0 && 
               message.details.status !== 'completed' && 
               message.details.status !== 'error' && 
               message.message !== 'Research completed' && (
                <details className="mt-2 group">
                  <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none">
                    View details
                  </summary>
                  <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 overflow-hidden">
                    {renderFormattedDetails(message.details)}
                  </div>
                </details>
              )}
            </div>
          ) : isWaitForEventMessage(message) ? (
            <div className={`border p-4 ${
              message.completed 
                ? 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700' 
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {message.completed ? 'Action Completed' : 'Action Required'}: {
                    message.event === 'research.plan.feedback' ? 'Review Research Plan' :
                    message.event === 'research.execution.feedback' ? 'Review Research Results' :
                    'Review'
                  }
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                  message.completed 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {message.completed ? 'Completed' : 'Pending'}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{message.question}</p>
              {message.details && Object.keys(message.details).length > 0 && (
                <details className="mb-3 group">
                  <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none">
                    View details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 overflow-hidden">
                    {renderFormattedDetails(message.details)}
                  </div>
                </details>
              )}
              {!message.completed && (
                <FeedbackForm
                  event={message.event}
                  uuid={message.uuid}
                  schema={message.schema}
                  onSubmitSuccess={() => {
                    onMessageUpdate?.(message.uuid, { completed: true })
                  }}
                />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}