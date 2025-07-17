/**
 * Tests for JSON-RPC support
 */

import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { createA2A } from '../core'
import { defineExecutor } from '../executor'
import { nextjsIntegration } from '../integrations/nextjs'

// Type for mock response
type MockResponse = {
  json: () => Promise<unknown>
  status: number
}

describe('JSON-RPC message/send', () => {
  it('should handle message/send request', async () => {
    const a2a = createA2A()
    
    const executor = defineExecutor({
      extension: 'https://example.com/test',
      execute: async () => ({ result: 'success' })
    })
    a2a.register(executor)
    
    const handlers = nextjsIntegration(a2a)
    
    const mockRequest = {
      json: async () => ({
        jsonrpc: '2.0',
        id: 'test-123',
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId: 'msg-456',
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
    
    expect(data).toMatchObject({
      jsonrpc: '2.0',
      id: 'test-123',
      result: {
        task: {
          id: 'msg-456',
          kind: 'task',
          status: {
            state: 'submitted'
          }
        },
        streamUrl: '/api/a2a/events?taskId=msg-456'
      }
    })
  })

  it('should return executor not found error', async () => {
    const a2a = createA2A()
    const handlers = nextjsIntegration(a2a)
    
    const mockRequest = {
      json: async () => ({
        jsonrpc: '2.0',
        id: 123,
        method: 'message/send',
        params: {
          message: {
            kind: 'message',
            messageId: 'msg-789',
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
    
    expect(data).toMatchObject({
      jsonrpc: '2.0',
      id: 123,
      error: {
        code: -32002, // EXECUTOR_NOT_FOUND
        message: 'No executor found for extensions'
      }
    })
  })
})

describe('JSON-RPC error handling', () => {
  it('should handle invalid JSON-RPC format', async () => {
    const a2a = createA2A()
    const handlers = nextjsIntegration(a2a)
    
    const mockRequest = {
      json: async () => ({
        invalid: 'request'
      })
    } as NextRequest
    
    const response = await handlers.POST(mockRequest)
    const data = await (response as MockResponse).json()
    
    expect(data).toMatchObject({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32600, // INVALID_REQUEST
        message: 'Invalid request format'
      }
    })
  })

  it('should handle unknown method', async () => {
    const a2a = createA2A()
    const handlers = nextjsIntegration(a2a)
    
    const mockRequest = {
      json: async () => ({
        jsonrpc: '2.0',
        id: 'test-456',
        method: 'tasks/setPushNotificationConfig',
        params: {
          taskId: 'task-123',
          config: {
            url: 'https://example.com/webhook'
          }
        }
      })
    } as NextRequest
    
    const response = await handlers.POST(mockRequest)
    const data = await (response as MockResponse).json()
    
    expect(data).toMatchObject({
      jsonrpc: '2.0',
      id: 'test-456',
      error: {
        code: -32601, // METHOD_NOT_FOUND
        message: expect.stringContaining('not implemented')
      }
    })
  })
})

describe('JSON-RPC with storage', () => {
  it('should return storage error when tasks/get without storage', async () => {
    const a2a = createA2A()
    const handlers = nextjsIntegration(a2a)
    
    const mockRequest = {
      json: async () => ({
        jsonrpc: '2.0',
        id: 'test-789',
        method: 'tasks/get',
        params: {
          taskId: 'task-123'
        }
      })
    } as NextRequest
    
    const response = await handlers.POST(mockRequest)
    const data = await (response as MockResponse).json()
    
    expect(data).toMatchObject({
      jsonrpc: '2.0',
      id: 'test-789',
      error: {
        code: -32003, // STORAGE_ERROR
        message: 'Storage adapter required for tasks/get'
      }
    })
  })
})