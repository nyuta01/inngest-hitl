/**
 * Dynamic routing handler for A2A REST API endpoints
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { A2AInstance } from '../../types'
import type { Message, TaskStatus } from '@a2a-js/sdk'
import type { Artifact1 } from '@a2a-js/sdk'

// Route handler type
type RouteHandler = (
  request: NextRequest,
  params: Record<string, string>,
  a2a: A2AInstance
) => Promise<Response>

// Route configuration
interface Route {
  pattern: string
  handler: RouteHandler
}

function updateStatusHandler(): RouteHandler {
  return async (request, params, a2a) => {
    const { taskId } = params
    const contextId = request.nextUrl.searchParams.get('contextId')
    console.info("[A2A] updateStatusHandler", {
      taskId,
      contextId,
    })
    if (!contextId) {
      return NextResponse.json(
        { error: 'contextId is required' },
        { status: 400 }
      )
    }

    try {
      const task = await a2a.getTask(taskId)
      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      
      const status = await request.json() as TaskStatus
      await a2a.updateStatus(taskId, contextId, status)
      
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Message handler error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Create message handler
 */
function createMessageHandler(): RouteHandler {
  return async (request, params, a2a) => {
    const { taskId } = params
    const contextId = request.nextUrl.searchParams.get('contextId')
    console.info("[A2A] createMessageHandler", {
      taskId,
      contextId,
    })
    if (!contextId) {
      return NextResponse.json(
        { error: 'contextId is required' },
        { status: 400 }
      )
    }
    
    try {
      const task = await a2a.getTask(taskId)
      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      
      const message = await request.json() as Message
      await a2a.updateMessage(taskId, contextId, message)
      
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Message handler error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Create artifact handler
 */
function createArtifactHandler(): RouteHandler {
  return async (request, params, a2a) => {
    const { taskId } = params
    const contextId = request.nextUrl.searchParams.get('contextId')
    console.info("[A2A] createArtifactHandler", {
      taskId,
      contextId,
    })
    if (!contextId) {
      return NextResponse.json(
        { error: 'contextId is required' },
        { status: 400 }
      )
    }
    
    try {
      const task = await a2a.getTask(taskId)
      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      const artifact = await request.json() as Artifact1
      await a2a.updateArtifact(taskId, contextId, artifact)
      
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('Artifact handler error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Get task handler
 */
function getTaskHandler(): RouteHandler {
  return async (_request, params, a2a) => {
    const { taskId } = params
    console.info("[A2A] getTaskHandler", {
      taskId,
      params,
    })
    
    try {
      const task = await a2a.getTask(taskId)
      if (!task) {
        return NextResponse.json(
          { error: 'Task not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(task)
    } catch (error) {
      console.error('Task handler error:', error)
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

/**
 * Match route pattern against path
 */
function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')
  
  if (patternParts.length !== pathParts.length) {
    return null
  }
  
  const params: Record<string, string> = {}
  
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      // Parameter
      const paramName = patternParts[i].slice(1)
      params[paramName] = pathParts[i]
    } else if (patternParts[i] !== pathParts[i]) {
      // No match
      return null
    }
  }
  
  return params
}

/**
 * Create dynamic routing handler
 */
export function createDynamicHandler(a2a: A2AInstance) {
  // Define routes
  const routes: Route[] = [
    {
      pattern: 'tasks/:taskId/status',
      handler: updateStatusHandler()
    },
    {
      pattern: 'tasks/:taskId/messages',
      handler: createMessageHandler()
    },
    {
      pattern: 'tasks/:taskId/artifacts',
      handler: createArtifactHandler()
    },
    {
      pattern: 'tasks/:taskId',
      handler: getTaskHandler()
    }
  ]
  
  return async (
    request: NextRequest,
    params: { all: string[] }
  ): Promise<Response> => {
    const path = params.all.join('/')
    
    // Find matching route
    for (const route of routes) {
      const routeParams = matchRoute(route.pattern, path)
      if (routeParams) {
        return route.handler(request, routeParams, a2a)
      }
    }
    
    // No route matched
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    )
  }
}