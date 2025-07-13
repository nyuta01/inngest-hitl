import { useState, useCallback } from 'react'
import type { StreamMessage, LogMessage, WaitForEventMessage } from '@/types/research'

interface UseResearchStreamReturn {
  loading: boolean
  completed: boolean
  error: string | null
  submitResearch: (theme: string) => Promise<void>
}

export function useResearchStream(
  onMessagesUpdate?: (messages: StreamMessage[] | ((prev: StreamMessage[]) => StreamMessage[])) => void
): UseResearchStreamReturn {
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)


  const submitResearch = useCallback(async (theme: string) => {
    if (!theme.trim()) return

    setLoading(true)
    setCompleted(false)
    setError(null)
    
    // Clear messages when starting new research
    onMessagesUpdate?.([])
    
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme }),
      })

      if (!response.ok) {
        throw new Error(`Failed to submit research: ${response.statusText}`)
      }

      // Handle SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let buffer = ''
      let isCompleted = false
      
      while (!isCompleted) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // Process stream inline to avoid closure issues
        let remainingBuffer = buffer
        let startIndex = 0
        
        while (true) {
          const endIndex = remainingBuffer.indexOf('\n', startIndex)
          if (endIndex === -1) {
            remainingBuffer = remainingBuffer.slice(startIndex)
            break
          }
          
          const line = remainingBuffer.slice(startIndex, endIndex).trim()
          startIndex = endIndex + 1
          
          if (line === '') continue
          
          try {
            const data = JSON.parse(line)
            
            if (data.topic === 'log' && data.data) {
              const logMessage: LogMessage = {
                type: 'log',
                id: data.data.id,
                timestamp: data.data.timestamp || data.createdAt,
                message: data.data.message || '',
                details: data.data.details
              }
              
              onMessagesUpdate?.(prev => {
                const isDuplicate = prev.some(m => 
                  m.type === 'log' && (
                    (m.id && logMessage.id && m.id === logMessage.id) ||
                    (m.timestamp === logMessage.timestamp && m.message === logMessage.message)
                  )
                )
                
                if (isDuplicate) {
                  return prev
                }
                
                return [...prev, logMessage]
              })
              
              // Check for completion message
              if (logMessage.message === "Research completed") {
                isCompleted = true
              }
            } else if (data.topic === 'waitForEvent' && data.data) {
              const waitMessage: WaitForEventMessage = {
                type: 'waitForEvent',
                id: data.data.id,
                timestamp: data.data.timestamp || data.createdAt || new Date().toISOString(),
                event: data.data.event || '',
                uuid: data.data.uuid || '',
                question: data.data.question || '',
                details: data.data.details,
                schema: data.data.schema
              }
              
              onMessagesUpdate?.(prev => {
                const existingIndex = prev.findIndex(
                  m => m.type === 'waitForEvent' && m.uuid === waitMessage.uuid
                )
                
                if (existingIndex >= 0) {
                  const newMessages = [...prev]
                  const existingMsg = prev[existingIndex]
                  newMessages[existingIndex] = {
                    ...waitMessage,
                    completed: existingMsg.type === 'waitForEvent' ? existingMsg.completed : undefined
                  }
                  return newMessages
                }
                return [...prev, waitMessage]
              })
            }
          } catch {
            // Skip invalid JSON
          }
        }
        
        buffer = remainingBuffer
        
        if (isCompleted) {
          await reader.cancel()
          setCompleted(true)
          setLoading(false)
          break
        }
      }

      if (!isCompleted) {
        setCompleted(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setCompleted(true)
      
      onMessagesUpdate?.(prev => [...prev, {
        type: 'log',
        timestamp: new Date().toISOString(),
        message: 'Research process failed',
        details: { 
          status: 'error', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        }
      }])
    } finally {
      setLoading(false)
    }
  }, [onMessagesUpdate])

  return {
    loading,
    completed,
    error,
    submitResearch
  }
}