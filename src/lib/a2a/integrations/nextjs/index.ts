/**
 * Next.js integration for A2A
 */

import type { NextRequest } from 'next/server'
import type { A2AInstance } from '../../types'
import { createSSEHandler, sendSSEEvent } from './sse'
import { handlePostRequest } from './handler'
import { createDynamicHandler } from './dynamic-handler'
import type { TaskStatusUpdateEvent, TaskArtifactUpdateEvent } from '@a2a-js/sdk'

export interface NextjsIntegrationOptions {
  /**
   * SSE configuration
   * - false: Disable SSE
   * - true or undefined: Enable SSE with default in-memory handler
   * - { path?: string }: Enable SSE with custom path
   * - { handler: (request: NextRequest) => Promise<Response> }: Use custom SSE handler (e.g., Redis)
   */
  sse?: boolean | { 
    path?: string
    handler?: (request: NextRequest) => Promise<Response>
  }
}

export interface NextjsHandlers {
  POST: (request: Request, context?: { params: Promise<{ all?: string[] }> }) => Promise<Response>
  GET?: (request: Request, context?: { params: Promise<{ all?: string[] }> }) => Promise<Response>
  PUT: (request: Request, context?: { params: Promise<{ all?: string[] }> }) => Promise<Response>
  DELETE: (request: Request, context?: { params: Promise<{ all?: string[] }> }) => Promise<Response>
}

/**
 * Create Next.js route handlers for A2A
 * 
 * @example
 * ```typescript
 * // In your API route (e.g., app/api/a2a/[[...all]]/route.ts)
 * import { createA2A } from '@/lib/a2a'
 * import { nextjsIntegration } from '@/lib/a2a/integrations/nextjs'
 * 
 * const a2a = createA2A({
 *   events: {
 *     send: createSSEEventSender()
 *   }
 * })
 * 
 * // Register executors
 * a2a.register(myExecutor)
 * 
 * // Export all handlers
 * export const { POST, GET, PUT, DELETE } = nextjsIntegration(a2a)
 * ```
 */
export function nextjsIntegration(
  a2a: A2AInstance,
  options?: NextjsIntegrationOptions
): NextjsHandlers {
  const dynamicHandler = createDynamicHandler(a2a)
  const postHandler = (request: NextRequest) => handlePostRequest(request, a2a)
  
  // SSE handler
  let sseHandler: ((request: NextRequest) => Promise<Response>) | undefined
  const sseConfig = options?.sse ?? true
  
  if (sseConfig !== false) {
    if (typeof sseConfig === 'object' && sseConfig.handler) {
      // Use custom SSE handler (e.g., Redis)
      sseHandler = sseConfig.handler as (request: NextRequest) => Promise<Response>
    } else {
      // Use default in-memory SSE handler
      const ssePath = typeof sseConfig === 'object' ? sseConfig.path : undefined
      sseHandler = createSSEHandler(a2a, ssePath)
    }
  }
  
  // Create unified route handlers
  const POST = async (request: Request, context?: { params: Promise<{ all?: string[] }> }) => {
    // Handle case where context might not exist (e.g., /api/a2a/route.ts)
    if (!context || !context.params) {
      return postHandler(request as unknown as NextRequest)
    }
    
    const resolvedParams = await context.params
    
    // If no path segments, handle as JSON-RPC
    if (!resolvedParams || !resolvedParams.all || resolvedParams.all.length === 0) {
      return postHandler(request as unknown as NextRequest)
    }
    
    // Otherwise, use dynamic handler
    return dynamicHandler(request as unknown as NextRequest, resolvedParams as { all: string[] })
  }
  
  const GET = async (request: Request, context?: { params: Promise<{ all?: string[] }> }) => {
    // Handle case where context might not exist
    if (!context || !context.params) {
      // For base route, return SSE handler if available
      if (sseHandler) {
        return sseHandler(request as unknown as NextRequest)
      }
      return new Response('Not found', { status: 404 })
    }
    
    const resolvedParams = await context.params
    
    // Check if this is the SSE endpoint
    if (resolvedParams?.all?.length === 1 && resolvedParams.all[0] === 'events' && sseHandler) {
      return sseHandler(request as unknown as NextRequest)
    }
    
    // Otherwise, use dynamic handler
    if (resolvedParams?.all) {
      return dynamicHandler(request as unknown as NextRequest, resolvedParams as { all: string[] })
    }
    
    return new Response('Not found', { status: 404 })
  }
  
  const PUT = async (request: Request, context?: { params: Promise<{ all?: string[] }> }) => {
    // PUT is only valid for dynamic routes
    if (!context || !context.params) {
      return new Response('Method not allowed', { status: 405 })
    }
    
    const resolvedParams = await context.params
    
    if (resolvedParams?.all) {
      return dynamicHandler(request as unknown as NextRequest, resolvedParams as { all: string[] })
    }
    
    return new Response('Not found', { status: 404 })
  }
  
  const DELETE = async (request: Request, context?: { params: Promise<{ all?: string[] }> }) => {
    // DELETE is only valid for dynamic routes
    if (!context || !context.params) {
      return new Response('Method not allowed', { status: 405 })
    }
    
    const resolvedParams = await context.params
    
    if (resolvedParams?.all) {
      return dynamicHandler(request as unknown as NextRequest, resolvedParams as { all: string[] })
    }
    
    return new Response('Not found', { status: 404 })
  }
  
  // Only include GET handler if SSE is enabled
  const handlers: NextjsHandlers = { POST, PUT, DELETE }
  
  if (sseHandler) {
    handlers.GET = GET
  }
  
  return handlers
}

/**
 * Create an SSE event sender for A2A
 * This should be passed to createA2A as the event sender
 */
export function createSSEEventSender() {
  return async (event: TaskStatusUpdateEvent | TaskArtifactUpdateEvent) => {
    sendSSEEvent(event)
  }
}

// Re-export useful functions
export { sendSSEEvent } from './sse'