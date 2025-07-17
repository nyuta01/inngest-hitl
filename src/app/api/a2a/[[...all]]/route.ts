/**
 * A2A Dynamic API Route
 * Handles all A2A endpoints with [[...all]] pattern
 */

import { nextjsIntegration } from '@/lib/a2a'
import { getA2AInstance, redisSSEHandler } from '@/executors/a2a'

// Create handlers with async instance initialization
const createHandlers = async () => {
  const a2aInstance = await getA2AInstance()
  return nextjsIntegration(a2aInstance, {
    sse: redisSSEHandler ? { handler: redisSSEHandler } : true
  })
}

// Export all handlers with optional Redis SSE
const handlers = await createHandlers()
export const { POST, GET, PUT, DELETE } = handlers