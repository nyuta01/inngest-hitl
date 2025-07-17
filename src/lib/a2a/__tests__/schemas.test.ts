/**
 * Tests for A2A schemas
 */

import { describe, it, expect } from 'vitest'
import {
  MessageSchema,
  TaskSchema,
  ArtifactSchema,
  TaskStateSchema,
  PartSchema,
  JSONRPCRequestSchema,
  JSONRPCErrorCode
} from '../schemas'

describe('Message Schema', () => {
  it('should validate a valid message', () => {
    const message = {
      kind: 'message',
      messageId: 'msg-123',
      role: 'user',
      parts: [
        { kind: 'text', text: 'Hello' }
      ],
      metadata: {}
    }

    const result = MessageSchema.safeParse(message)
    expect(result.success).toBe(true)
  })

  it('should reject invalid role', () => {
    const message = {
      kind: 'message',
      messageId: 'msg-123',
      role: 'invalid',
      parts: [],
      metadata: {}
    }

    const result = MessageSchema.safeParse(message)
    expect(result.success).toBe(false)
  })

  it('should accept optional fields', () => {
    const message = {
      kind: 'message',
      messageId: 'msg-123',
      role: 'agent',
      parts: [],
      contextId: 'ctx-456',
      extensions: ['https://example.com/ext'],
      metadata: { custom: 'data' },
      referenceTaskIds: ['task-789'],
      taskId: 'task-999'
    }

    const result = MessageSchema.safeParse(message)
    expect(result.success).toBe(true)
  })
})

describe('Task Schema', () => {
  it('should validate a valid task', () => {
    const task = {
      contextId: 'ctx-123',
      id: 'task-456',
      kind: 'task',
      status: {
        state: 'working',
        timestamp: '2024-01-01T00:00:00Z'
      },
      metadata: {}
    }

    const result = TaskSchema.safeParse(task)
    expect(result.success).toBe(true)
  })

  it('should validate all task states', () => {
    const states = [
      'submitted', 'working', 'input-required', 'completed',
      'canceled', 'failed', 'rejected', 'auth-required', 'unknown'
    ]

    for (const state of states) {
      const result = TaskStateSchema.safeParse(state)
      expect(result.success).toBe(true)
    }
  })

  it('should accept optional history and artifacts', () => {
    const task = {
      contextId: 'ctx-123',
      id: 'task-456',
      kind: 'task',
      status: {
        state: 'completed'
      },
      metadata: {},
      history: [
        {
          kind: 'message',
          messageId: 'msg-789',
          role: 'user',
          parts: [],
          metadata: {}
        }
      ],
      artifacts: [
        {
          artifactId: 'art-111',
          parts: [],
          metadata: {}
        }
      ]
    }

    const result = TaskSchema.safeParse(task)
    expect(result.success).toBe(true)
  })
})

describe('Artifact Schema', () => {
  it('should validate a valid artifact', () => {
    const artifact = {
      artifactId: 'art-123',
      parts: [
        { kind: 'data', data: { content: 'test' } }
      ],
      metadata: {}
    }

    const result = ArtifactSchema.safeParse(artifact)
    expect(result.success).toBe(true)
  })

  it('should accept optional fields', () => {
    const artifact = {
      artifactId: 'art-123',
      name: 'test.txt',
      description: 'Test file',
      parts: [
        { kind: 'text', text: 'Hello' },
        { kind: 'file', file: { bytes: 'SGVsbG8=', mimeType: 'text/plain' } }
      ],
      extensions: ['https://example.com/ext'],
      metadata: { version: 1 }
    }

    const result = ArtifactSchema.safeParse(artifact)
    expect(result.success).toBe(true)
  })
})

describe('Part Schema', () => {
  it('should validate text part', () => {
    const part = { kind: 'text', text: 'Hello world' }
    const result = PartSchema.safeParse(part)
    expect(result.success).toBe(true)
  })

  it('should validate file part', () => {
    const part = {
      kind: 'file',
      file: {
        bytes: 'SGVsbG8gd29ybGQ=',
        mimeType: 'text/plain',
        name: 'hello.txt'
      }
    }
    const result = PartSchema.safeParse(part)
    expect(result.success).toBe(true)
  })

  it('should validate data part', () => {
    const part = {
      kind: 'data',
      data: {
        foo: 'bar',
        nested: { value: 123 },
        array: [1, 2, 3]
      }
    }
    const result = PartSchema.safeParse(part)
    expect(result.success).toBe(true)
  })
})

describe('JSON-RPC Schema', () => {
  it('should validate message/send request', () => {
    const request = {
      jsonrpc: '2.0',
      id: 'test-123',
      method: 'message/send',
      params: {
        message: {
          kind: 'message',
          messageId: 'msg-456',
          role: 'user',
          parts: [],
          metadata: {}
        }
      }
    }

    const result = JSONRPCRequestSchema.safeParse(request)
    expect(result.success).toBe(true)
  })

  it('should validate tasks/get request', () => {
    const request = {
      jsonrpc: '2.0',
      id: 123,
      method: 'tasks/get',
      params: {
        taskId: 'task-789'
      }
    }

    const result = JSONRPCRequestSchema.safeParse(request)
    expect(result.success).toBe(true)
  })

  it('should validate tasks/cancel request', () => {
    const request = {
      jsonrpc: '2.0',
      id: null,
      method: 'tasks/cancel',
      params: {
        taskId: 'task-789',
        reason: 'User requested'
      }
    }

    const result = JSONRPCRequestSchema.safeParse(request)
    expect(result.success).toBe(true)
  })

  it('should reject invalid method', () => {
    const request = {
      jsonrpc: '2.0',
      id: 'test-123',
      method: 'invalid/method',
      params: {}
    }

    const result = JSONRPCRequestSchema.safeParse(request)
    expect(result.success).toBe(false)
  })

  it('should reject non-2.0 jsonrpc version', () => {
    const request = {
      jsonrpc: '1.0',
      id: 'test-123',
      method: 'message/send',
      params: {
        message: {
          kind: 'message',
          messageId: 'msg-456',
          role: 'user',
          parts: [],
          metadata: {}
        }
      }
    }

    const result = JSONRPCRequestSchema.safeParse(request)
    expect(result.success).toBe(false)
  })
})

describe('JSON-RPC Error Codes', () => {
  it('should have all standard error codes', () => {
    expect(JSONRPCErrorCode.PARSE_ERROR).toBe(-32700)
    expect(JSONRPCErrorCode.INVALID_REQUEST).toBe(-32600)
    expect(JSONRPCErrorCode.METHOD_NOT_FOUND).toBe(-32601)
    expect(JSONRPCErrorCode.INVALID_PARAMS).toBe(-32602)
    expect(JSONRPCErrorCode.INTERNAL_ERROR).toBe(-32603)
  })

  it('should have A2A specific error codes', () => {
    expect(JSONRPCErrorCode.TASK_NOT_FOUND).toBe(-32001)
    expect(JSONRPCErrorCode.EXECUTOR_NOT_FOUND).toBe(-32002)
    expect(JSONRPCErrorCode.STORAGE_ERROR).toBe(-32003)
  })
})