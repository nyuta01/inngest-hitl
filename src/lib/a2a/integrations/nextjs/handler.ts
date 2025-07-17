/**
 * Next.js POST request handler for A2A JSON-RPC
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import type { A2AInstance } from '../../types'
import { 
  JSONRPCRequestSchema,
  JSONRPCErrorCode,
  type JSONRPCRequest
} from '../../schemas'
import type { Message, Task } from '@a2a-js/sdk'

/**
 * Handle POST requests containing JSON-RPC messages
 */
export async function handlePostRequest(
  request: NextRequest,
  a2a: A2AInstance
): Promise<NextResponse> {
  let id: string | number | null = null
  
  try {
    // Parse request body
    const body = await request.json()
    
    // Validate JSON-RPC request
    const parseResult = JSONRPCRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return createErrorResponse(
        body.id ?? null,
        JSONRPCErrorCode.INVALID_REQUEST,
        'Invalid request format',
        parseResult.error.format()
      )
    }
    
    const rpcRequest = parseResult.data
    id = rpcRequest.id
    
    // Handle different methods
    switch (rpcRequest.method) {
      case 'message/send':
        return await handleMessageSend(rpcRequest, a2a)
        
      case 'tasks/get':
        return await handleTasksGet(rpcRequest, a2a)
        
      case 'tasks/cancel':
        return await handleTasksCancel(rpcRequest, a2a)
        
      case 'tasks/setPushNotificationConfig':
      case 'tasks/getPushNotificationConfig':
        return createErrorResponse(
          id,
          JSONRPCErrorCode.METHOD_NOT_FOUND,
          `Method ${rpcRequest.method} not implemented`
        )
        
      default:
        // This should never happen due to discriminated union
        return createErrorResponse(
          id,
          JSONRPCErrorCode.METHOD_NOT_FOUND,
          'Unknown method'
        )
    }
  } catch (error) {
    console.error('Error handling JSON-RPC request:', error)
    
    return createErrorResponse(
      id,
      JSONRPCErrorCode.INTERNAL_ERROR,
      'Internal server error',
      error instanceof Error ? error.message : undefined
    )
  }
}

/**
 * Handle message/send method
 */
async function handleMessageSend(
  request: Extract<JSONRPCRequest, { method: 'message/send' }>,
  a2a: A2AInstance
): Promise<NextResponse> {
  try {
    const message = request.params.message as Message
    const context = request.params.context as { taskId?: string, contextId?: string } | undefined
    
    // Use context taskId if provided, otherwise use messageId for new tasks
    const taskId = context?.taskId || crypto.randomUUID()
    const contextId = context?.contextId || crypto.randomUUID()
    console.log('[JSON-RPC Handler] Context taskId:', context?.taskId, 'Final taskId:', taskId)
    
    // Execute message with consistent taskId
    await a2a.execute(message, { taskId, contextId })
    
    // Create task response
    const task: Task = {
      contextId: message.contextId || 'default',
      id: taskId,
      kind: 'task',
      status: {
        state: 'submitted',
        timestamp: new Date().toISOString()
      },
      metadata: {},
      history: [message]
    }
    
    // Check if SSE is available for streaming
    const streamUrl = `/api/a2a/events?taskId=${task.id}`
    
    return createSuccessResponse(request.id, {
      task,
      streamUrl
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('No executor found')) {
      return createErrorResponse(
        request.id,
        JSONRPCErrorCode.EXECUTOR_NOT_FOUND,
        'No executor found for extensions',
        { extensions: request.params.message.extensions }
      )
    }
    
    throw error
  }
}

/**
 * Handle tasks/get method
 */
async function handleTasksGet(
  request: Extract<JSONRPCRequest, { method: 'tasks/get' }>,
  a2a: A2AInstance
): Promise<NextResponse> {
  // Check if storage is available
  if (!a2a.getTask) {
    return createErrorResponse(
      request.id,
      JSONRPCErrorCode.STORAGE_ERROR,
      'Storage adapter required for tasks/get'
    )
  }
  
  try {
    const task = await a2a.getTask(request.params.taskId)
    
    if (!task) {
      return createErrorResponse(
        request.id,
        JSONRPCErrorCode.TASK_NOT_FOUND,
        `Task not found: ${request.params.taskId}`
      )
    }
    
    return createSuccessResponse(request.id, { task })
  } catch (error) {
    return createErrorResponse(
      request.id,
      JSONRPCErrorCode.STORAGE_ERROR,
      'Failed to retrieve task',
      error instanceof Error ? error.message : undefined
    )
  }
}

/**
 * Handle tasks/cancel method
 */
async function handleTasksCancel(
  request: Extract<JSONRPCRequest, { method: 'tasks/cancel' }>,
  a2a: A2AInstance
): Promise<NextResponse> {  
  const { taskId, contextId, reason } = request.params
  
  try {
    const updatedTask = await a2a.cancelTask(taskId, contextId, {
      role: 'agent',
      messageId: crypto.randomUUID(),
      kind: 'message',
      parts: [
        {
          kind: 'text',
          text: reason || 'Task canceled'
        }
      ],
      metadata: {}
    })
    return createSuccessResponse(request.id, { task: updatedTask })
  } catch (error) {
    return createErrorResponse(
      request.id,
      JSONRPCErrorCode.STORAGE_ERROR,
      'Failed to cancel task',
      error instanceof Error ? error.message : undefined
    )
  }
}

/**
 * Create JSON-RPC error response
 */
function createErrorResponse(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown
): NextResponse {
  const response = {
    jsonrpc: '2.0' as const,
    id,
    error: {
      code,
      message,
      ...(data !== undefined && { data })
    }
  }
  
  return NextResponse.json(response, { status: 200 }) // JSON-RPC always returns 200
}

/**
 * Create JSON-RPC success response
 */
function createSuccessResponse(
  id: string | number | null,
  result: unknown
): NextResponse {
  const response = {
    jsonrpc: '2.0' as const,
    id,
    result
  }
  
  return NextResponse.json(response, { status: 200 })
}