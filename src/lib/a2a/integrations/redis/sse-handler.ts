/**
 * Redis-based SSE Handler
 * Manages SSE connections and subscribes to Redis channels
 */

import type { NextRequest } from 'next/server'
import type { Redis } from 'ioredis'
import type { A2AInstance } from '../../types'

export interface RedisSSEHandlerOptions {
  /** Redis client for subscribing (must be dedicated for subscriptions) */
  subscriber: Redis
  /** Channel prefix (default: 'a2a:task:') */
  channelPrefix?: string
  /** Connection TTL in seconds (default: 60) */
  connectionTTL?: number
  /** Whether to log connection events (default: false) */
  debug?: boolean
}

// Track active connections per task
const activeConnections = new Map<string, Set<ReadableStreamDefaultController>>()

/**
 * Create a Redis-based SSE handler
 * 
 * @example
 * ```typescript
 * import Redis from 'ioredis'
 * import { createRedisSSEHandler } from '@/lib/a2a/integrations/redis'
 * 
 * const subscriber = new Redis()
 * const sseHandler = createRedisSSEHandler({ subscriber })
 * ```
 */
export function createRedisSSEHandler(
  a2a: A2AInstance,
  options: RedisSSEHandlerOptions
) {
  const { 
    subscriber, 
    channelPrefix = 'a2a:task:', 
    connectionTTL = 60,
    debug = false 
  } = options
  
  // Set up message handler
  subscriber.on('message', (channel: string, message: string) => {
    // Extract taskId from channel
    const taskId = channel.replace(channelPrefix, '')
    const controllers = activeConnections.get(taskId)
    
    if (!controllers || controllers.size === 0) {
      // No active connections, unsubscribe
      subscriber.unsubscribe(channel)
      return
    }
    
    try {
      const event = JSON.parse(message)
      const sseMessage = formatSSEMessage(event.type, event)
      
      // Send to all connected clients
      for (const controller of controllers) {
        try {
          controller.enqueue(sseMessage)
        } catch (error) {
          // Client disconnected, remove from set
          controllers.delete(controller)
        }
      }
      
      // Clean up if no controllers left
      if (controllers.size === 0) {
        activeConnections.delete(taskId)
        subscriber.unsubscribe(channel)
      }
    } catch (error) {
      console.error('[Redis SSE] Failed to process message:', error)
    }
  })
  
  return async (request: NextRequest): Promise<Response> => {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')
    
    if (!taskId) {
      return new Response('Missing taskId parameter', { status: 400 })
    }
    
    // Verify task exists if storage is available
    if (a2a.getTask) {
      const task = await a2a.getTask(taskId)
      if (!task) {
        return new Response('Task not found', { status: 404 })
      }
    }
    
    const channel = `${channelPrefix}${taskId}`
    
    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        // Add to active connections
        if (!activeConnections.has(taskId)) {
          activeConnections.set(taskId, new Set())
        }
        const controllers = activeConnections.get(taskId)
        if (controllers) {
          controllers.add(controller)
        }
        
        // Subscribe to Redis channel
        const subscriberCount = await subscriber.subscribe(channel)
        
        if (debug) {
          console.log(`[Redis SSE] Client connected to ${taskId}, total subscribers: ${subscriberCount}`)
        }
        
        // Send initial connection event
        controller.enqueue(formatSSEMessage('connected', { taskId }))
        
        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(':heartbeat\\n\\n')
          } catch {
            clearInterval(heartbeatInterval)
          }
        }, 30000)
        
        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval)
          
          // Remove from active connections
          const controllers = activeConnections.get(taskId)
          if (controllers) {
            controllers.delete(controller)
            if (controllers.size === 0) {
              activeConnections.delete(taskId)
              subscriber.unsubscribe(channel)
            }
          }
          
          if (debug) {
            console.log(`[Redis SSE] Client disconnected from ${taskId}`)
          }
          
          try {
            controller.close()
          } catch {
            // Already closed
          }
        })
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      }
    })
  }
}

/**
 * Format an event as SSE message
 */
function formatSSEMessage(eventType: string, data: unknown): Uint8Array {
  const lines = [
    `event: ${eventType}`,
    `data: ${JSON.stringify(data)}`,
    '', // Empty line to end the message
    '' // Extra newline for message boundary
  ]
  
  return new TextEncoder().encode(lines.join('\\n'))
}