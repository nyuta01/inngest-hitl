/**
 * Shared A2A server instance
 * This ensures all routes use the same instance with shared storage
 * Supports optional Redis Pub/Sub for SSE event distribution
 */

import { createA2A, createSSEEventSender, drizzleAdapter } from '@/lib/a2a'
import type { A2AEvent } from '@/lib/a2a/types'
import type { NextRequest } from 'next/server'
import { 
  researchStartExecutorV2, 
  planApprovalExecutorV2, 
  executionApprovalExecutorV2 
} from '@/executors/research-a2a'
import { db } from '@/db'
import * as schema from '@/db/schema'

// Check if Redis is configured
const redisUrl = process.env.REDIS_URL
const useRedis = !!redisUrl && process.env.REDIS_ENABLE_SSE === 'true'

// Redis integration with conditional loading
let redisEventSender: ((event: A2AEvent) => Promise<void>) | null = null
let redisSSEHandler: ((request: Request) => Promise<Response>) | null = null

// Initialize Redis integration if enabled
if (useRedis && redisUrl) {
  try {
    // Use dynamic import() which returns a Promise
    Promise.all([
      import('ioredis'),
      import('@/lib/a2a/integrations/redis')
    ]).then(([{ default: Redis }, redisModule]) => {
      const publisher = new Redis(redisUrl)
      const subscriber = new Redis(redisUrl)

      redisEventSender = redisModule.createRedisSSEEventSender({
        publisher,
        channelPrefix: 'a2a:task:',
        debug: process.env.NODE_ENV === 'development'
      })

      // Create SSE handler factory
      const createHandler = redisModule.createRedisSSEHandler
      redisSSEHandler = async (request: Request) => {
        const instance = await getA2AInstance()
        return createHandler(instance, {
          subscriber,
          channelPrefix: 'a2a:task:',
          debug: process.env.NODE_ENV === 'development'
        })(request as NextRequest)
      }

      console.log('[A2A] Redis SSE support enabled')
    }).catch((error) => {
      console.warn('[A2A] Failed to load Redis integration:', error)
    })
  } catch (error) {
    console.warn('[A2A] Failed to initialize Redis integration:', error)
  }
}

// Create event sender - fallback to in-memory if Redis not available
const eventSender = redisEventSender ?? createSSEEventSender()

// Create singleton A2A instance
let a2aInstance: ReturnType<typeof createA2A>

// Initialize A2A instance async
const initializeA2A = async () => {
  if (!a2aInstance) {
    a2aInstance = createA2A({
      storage: drizzleAdapter(db, { 
        provider: 'sqlite',
        schema: {
          tasks: schema.tasks,
          messages: schema.messages,
          artifacts: schema.artifacts,
          taskMessages: schema.taskMessages,
        }
      }),
      events: {
        send: eventSender
      }
    })
    
    // Register executors
    a2aInstance
      .register(researchStartExecutorV2)
      .register(planApprovalExecutorV2)
      .register(executionApprovalExecutorV2)
  }
  return a2aInstance
}

// Export promise-based instance getter
export const getA2AInstance = initializeA2A

// Export Redis SSE handler (will be populated async if Redis is enabled)
export { redisSSEHandler }