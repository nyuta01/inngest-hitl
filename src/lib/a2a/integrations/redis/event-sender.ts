/**
 * Redis-based SSE Event Sender
 * Publishes events to Redis Pub/Sub for distribution across instances
 */

import type { Redis } from 'ioredis'
import type { A2AEvent } from '../../types'

export interface RedisEventSenderOptions {
  /** Redis client for publishing */
  publisher: Redis
  /** Channel prefix (default: 'a2a:task:') */
  channelPrefix?: string
  /** Whether to log published events (default: false) */
  debug?: boolean
}

/**
 * Create a Redis-based event sender
 * 
 * @example
 * ```typescript
 * import Redis from 'ioredis'
 * import { createRedisSSEEventSender } from '@/lib/a2a/integrations/redis'
 * 
 * const redis = new Redis()
 * const eventSender = createRedisSSEEventSender({ publisher: redis })
 * 
 * const a2a = createA2A({
 *   events: { send: eventSender }
 * })
 * ```
 */
export function createRedisSSEEventSender(options: RedisEventSenderOptions) {
  const { publisher, channelPrefix = 'a2a:task:', debug = false } = options
  
  return async (event: A2AEvent): Promise<void> => {
    const channel = `${channelPrefix}${event.taskId}`
    const payload = JSON.stringify({
      ...event,
      timestamp: new Date().toISOString()
    })
    
    try {
      const subscriberCount = await publisher.publish(channel, payload)
      
      if (debug) {
        console.log(`[Redis SSE] Published to ${channel} (${subscriberCount} subscribers):`, event.kind)
      }
    } catch (error) {
      console.error('[Redis SSE] Failed to publish event:', error)
      // Don't throw - SSE failures shouldn't break the main flow
    }
  }
}