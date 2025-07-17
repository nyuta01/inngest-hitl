/**
 * Setup helpers for Redis SSE integration
 */

import Redis, { type RedisOptions } from 'ioredis'
import type { NextRequest } from 'next/server'
import { createRedisSSEEventSender } from './event-sender'
import { createRedisSSEHandler } from './sse-handler'
import type { A2AConfig } from '../../types'
import type { NextjsIntegrationOptions } from '../nextjs'

export interface RedisSSEConfig {
  /** Redis URL (default: from REDIS_URL env var) */
  url?: string
  /** Channel prefix (default: 'a2a:task:') */
  channelPrefix?: string
  /** Enable debug logging (default: false) */
  debug?: boolean
  /** Additional Redis options */
  redisOptions?: RedisOptions
}

/**
 * Create A2A configuration with Redis SSE support
 * 
 * @example
 * ```typescript
 * import { createA2A } from '@/lib/a2a'
 * import { createRedisSSEConfig } from '@/lib/a2a/integrations/redis'
 * 
 * const { config, nextjsOptions } = await createRedisSSEConfig({
 *   url: 'redis://localhost:6379',
 *   debug: true
 * })
 * 
 * const a2a = createA2A(config)
 * export const { POST, GET } = nextjsIntegration(a2a, nextjsOptions)
 * ```
 */
export async function createRedisSSEConfig(
  redisConfig?: RedisSSEConfig
): Promise<{
  config: A2AConfig
  nextjsOptions: NextjsIntegrationOptions
}> {
  const url = redisConfig?.url || process.env.REDIS_URL
  
  if (!url) {
    throw new Error('Redis URL not provided. Set REDIS_URL environment variable or pass url option.')
  }
  
  // Create Redis clients
  const publisher = new Redis(url, {
    ...redisConfig?.redisOptions,
    lazyConnect: true
  })
  
  const subscriber = new Redis(url, {
    ...redisConfig?.redisOptions,
    lazyConnect: true
  })
  
  // Connect to Redis
  await Promise.all([
    publisher.connect(),
    subscriber.connect()
  ])
  
  // Create event sender
  const eventSender = createRedisSSEEventSender({
    publisher,
    channelPrefix: redisConfig?.channelPrefix,
    debug: redisConfig?.debug
  })
  
  return {
    config: {
      events: {
        send: eventSender
      }
    },
    nextjsOptions: {
      sse: {
        handler: undefined as unknown as (request: NextRequest) => Promise<Response>
      }
    }
  }
}

/**
 * Create Redis-enabled A2A instance with Next.js integration
 * This is a convenience function that sets up everything in one go
 */
export async function createRedisA2A(
  storage: A2AConfig['storage'],
  redisConfig?: RedisSSEConfig
) {
  const { config, nextjsOptions } = await createRedisSSEConfig(redisConfig)
  
  // Import here to avoid circular dependency
  const { createA2A } = await import('../../core')
  const { nextjsIntegration } = await import('../nextjs')
  
  // Create A2A instance
  const a2a = createA2A({
    ...config,
    storage
  })
  
  // Create Redis SSE handler for this specific A2A instance
  const url = redisConfig?.url || process.env.REDIS_URL
  if (!url) {
    throw new Error('Redis URL not provided')
  }
  const subscriber = new Redis(url, {
    ...redisConfig?.redisOptions,
    lazyConnect: true
  })
  await subscriber.connect()
  
  const sseHandler = createRedisSSEHandler(a2a, {
    subscriber,
    channelPrefix: redisConfig?.channelPrefix,
    debug: redisConfig?.debug
  })
  
  // Update nextjs options with the handler
  nextjsOptions.sse = {
    handler: sseHandler
  }
  
  return {
    a2a,
    handlers: nextjsIntegration(a2a, nextjsOptions)
  }
}