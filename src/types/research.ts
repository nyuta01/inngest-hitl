export interface LogMessage {
  type: 'log'
  id?: string
  timestamp: string
  message: string
  details?: Record<string, unknown>
}

export interface WaitForEventMessage {
  type: 'waitForEvent'
  id?: string
  timestamp: string
  event: string
  uuid: string
  question: string
  completed?: boolean
  details?: Record<string, unknown>
  schema?: {
    properties?: {
      feedback?: {
        type: string
        description?: string
      }
      [key: string]: unknown
    }
  }
}

export type StreamMessage = LogMessage | WaitForEventMessage

export interface ResearchFormProps {
  onMessagesUpdate?: (messages: StreamMessage[] | ((prev: StreamMessage[]) => StreamMessage[])) => void
}

export interface ResearchDisplayProps {
  messages: StreamMessage[]
  onMessageUpdate?: (uuid: string, updates: Partial<WaitForEventMessage>) => void
}

export interface FeedbackFormProps {
  event: string
  uuid: string
  onSubmitSuccess?: () => void
  schema?: {
    properties?: {
      feedback?: {
        type: string
        description?: string
      }
      [key: string]: unknown
    }
  }
}

// Type guards
export const isLogMessage = (msg: StreamMessage): msg is LogMessage => msg.type === 'log'
export const isWaitForEventMessage = (msg: StreamMessage): msg is WaitForEventMessage => msg.type === 'waitForEvent'

// Helper functions
export const isPendingApproval = (msg: StreamMessage): boolean => 
  isWaitForEventMessage(msg) && !msg.completed

export const isResearchCompleted = (msg: StreamMessage): boolean => 
  isLogMessage(msg) && msg.message === 'Research completed'

export const hasError = (msg: StreamMessage): boolean => 
  isLogMessage(msg) && msg.details?.status === 'error'