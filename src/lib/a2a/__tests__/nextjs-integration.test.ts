/**
 * Tests for Next.js integration
 */

import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createA2A } from '../core'
import { defineExecutor } from '../executor'
import { nextjsIntegration, createSSEEventSender } from '../integrations/nextjs'
import { z } from 'zod'

// Type for mock response
type MockResponse = {
  json: () => Promise<any>
  status: number
}

// Mock Next.js server
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) => ({
      json: async () => data,
      status: init?.status ?? 200
    })
  }
}))

describe('nextjsIntegration', () => {
  it('should create POST and GET handlers by default', () => {
    const a2a = createA2A()
    const handlers = nextjsIntegration(a2a)
    
    expect(handlers.POST).toBeDefined()
    expect(handlers.GET).toBeDefined()
  })

  it('should only create POST handler when SSE is disabled', () => {
    const a2a = createA2A()
    const handlers = nextjsIntegration(a2a, { sse: false })
    
    expect(handlers.POST).toBeDefined()
    expect(handlers.GET).toBeUndefined()
  })

  it('should handle POST requests with valid JSON-RPC messages', async () => {
    const a2a = createA2A()
    
    // Register an executor
    const executor = defineExecutor({
      extension: 'https://example.com/test',
      execute: async () => ({ result: 'success' })
    })
    a2a.register(executor)
    
    const handlers = nextjsIntegration(a2a)
    
    // Create mock JSON-RPC request
    const mockRequest = {
      json: async () => ({
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId: 'test-id',
            role: 'user',
            parts: [],
            extensions: ['https://example.com/test'],
            metadata: {}
          }
        }
      })
    } as NextRequest
    
    const response = await handlers.POST(mockRequest)
    const data = await (response as MockResponse).json()
    
    expect(data.jsonrpc).toBe('2.0')
    expect(data.id).toBe('test-123')
    expect(data.result).toMatchObject({
      task: {
        id: 'test-id',
        kind: 'task',
        status: { state: 'submitted' }
      }
    })
  })

  it('should return JSON-RPC error for invalid format', async () => {
    const a2a = createA2A()
    const handlers = nextjsIntegration(a2a)
    
    const mockRequest = {
      json: async () => ({
        invalid: 'message'
      })
    } as NextRequest
    
    const response = await handlers.POST(mockRequest)
    const data = await (response as MockResponse).json()
    
    expect((response as MockResponse).status).toBe(200) // JSON-RPC always returns 200
    expect(data.jsonrpc).toBe('2.0')
    expect(data.error).toMatchObject({
      code: -32600, // INVALID_REQUEST
      message: 'Invalid request format'
    })
  })

  it('should return JSON-RPC error when no executor found', async () => {
    const a2a = createA2A()
    const handlers = nextjsIntegration(a2a)
    
    const mockRequest = {
      json: async () => ({
        jsonrpc: '2.0',
        id: 'test-456',
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId: 'test-id',
            role: 'user',
            parts: [],
            extensions: ['https://example.com/unknown'],
            metadata: {}
          }
        }
      })
    } as NextRequest
    
    const response = await handlers.POST(mockRequest)
    const data = await (response as MockResponse).json()
    
    expect((response as MockResponse).status).toBe(200) // JSON-RPC always returns 200
    expect(data.jsonrpc).toBe('2.0')
    expect(data.error).toMatchObject({
      code: -32002, // EXECUTOR_NOT_FOUND
      message: 'No executor found for extensions'
    })
  })
})

describe('createSSEEventSender', () => {
  it('should create an event sender function', () => {
    const sender = createSSEEventSender()
    expect(typeof sender).toBe('function')
  })

  it('should handle events without errors', async () => {
    const sender = createSSEEventSender()
    
    // Should not throw
    await expect(sender({
      type: 'status-update',
      taskId: 'test-task',
      data: {
        state: 'working',
        timestamp: new Date().toISOString()
      }
    })).resolves.toBeUndefined()
  })
})

describe('POST handler with executor input/output schemas', () => {
  it('should validate input and output with schemas via JSON-RPC', async () => {
    const a2a = createA2A()
    
    const inputSchema = z.object({
      text: z.string()
    })
    
    const outputSchema = z.object({
      processed: z.string(),
      length: z.number()
    })
    
    const executor = defineExecutor({
      extension: 'https://example.com/process',
      input: inputSchema,
      output: outputSchema,
      execute: async (input) => ({
        processed: input.text.toUpperCase(),
        length: input.text.length
      })
    })
    
    a2a.register(executor)
    
    const handlers = nextjsIntegration(a2a)
    
    const mockRequest = {
      json: async () => ({
        jsonrpc: '2.0',
        id: 'test-789',
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId: 'test-id',
            role: 'user',
            parts: [{ kind: 'text', text: 'hello world' }],
            extensions: ['https://example.com/process'],
            metadata: {}
          }
        }
      })
    } as NextRequest
    
    const response = await handlers.POST(mockRequest)
    const data = await (response as MockResponse).json()
    
    expect(data.jsonrpc).toBe('2.0')
    expect(data.id).toBe('test-789')
    expect(data.result).toMatchObject({
      task: {
        id: 'test-id',
        kind: 'task',
        status: { state: 'submitted' }
      }
    })
  })
})