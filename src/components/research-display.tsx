"use client"

import { useMemo } from "react"
import type { ResearchDisplayProps } from "@/types/research"
import { isLogMessage, isPendingApproval, isResearchCompleted } from "@/types/research"
import { TimelineItem } from "./timeline-item"
import { EmptyState } from "./empty-state"
import { SummaryStats } from "./summary-stats"

export function ResearchDisplay({ messages, onMessageUpdate }: ResearchDisplayProps) {
  // Memoize computed values for performance
  const { sortedMessages, pendingApprovals, completedSteps, isCompleted } = useMemo(() => {
    const sorted = [...messages].sort((a, b) => {
      const aTime = new Date(a.timestamp).getTime()
      const bTime = new Date(b.timestamp).getTime()
      return bTime - aTime
    })

    return {
      sortedMessages: sorted,
      pendingApprovals: messages.filter(isPendingApproval),
      completedSteps: messages.filter(isLogMessage),
      isCompleted: messages.some(isResearchCompleted)
    }
  }, [messages])

  if (messages.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="flex flex-col h-full space-y-2">
      {/* Summary Stats */}
      <div className="flex-shrink-0">
        <SummaryStats 
          isCompleted={isCompleted} 
          completedSteps={completedSteps.length} 
          pendingApprovals={pendingApprovals.length} 
        />
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1.5 flex-shrink-0">Timeline</h3>
        <div className="flex-1 overflow-y-auto pr-2 space-y-1.5">
          {sortedMessages.map((msg, index) => (
            <TimelineItem
              key={`message-${index}-${msg.type}-${msg.type === 'waitForEvent' ? msg.uuid : msg.timestamp}`}
              message={msg}
              isLast={index === sortedMessages.length - 1}
              onMessageUpdate={onMessageUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  )
}