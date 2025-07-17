/**
 * Tests for core A2A module
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { createA2A } from '../core'
import { defineExecutor } from '../executor'
import type { Message } from '@a2a-js/sdk'
import type { A2AEvent } from '../types'

describe('createA2A', () => {
  it('should create an A2A instance', () => {
    const a2a = createA2A()
    
    expect(a2a.register).toBeDefined()
    expect(a2a.execute).toBeDefined()
  })

  it('should register and execute an executor', async () => {
    const a2a = createA2A()
    
    const executor = defineExecutor({
      extension: 'https://example.com/test',
      execute: async () => {
        return { result: 'success' }
      }
    })
    
    a2a.register(executor)
    
    const message: Message = {
      kind: 'message',
      messageId: 'test-message',
      role: 'user',
      parts: [],
      extensions: ['https://example.com/test'],
      metadata: {}
    }
    
    const result = await a2a.execute(message, {
      taskId: 'test-task-id',
      contextId: 'test-context-id'
    })
    expect(result).toEqual({ result: 'success' })
  })

  it('should throw error when no executor found', async () => {
    const a2a = createA2A()
    
    const message: Message = {
      kind: 'message',
      messageId: 'test-message',
      role: 'user',
      parts: [],
      extensions: ['https://example.com/unknown'],
      metadata: {}
    }
    
    await expect(a2a.execute(message, {
      taskId: 'test-task-id',
      contextId: 'test-context-id'
    })).rejects.toThrow('No executor found')
  })

  it('should extract text input from message', async () => {
    const a2a = createA2A()
    
    const executor = defineExecutor({
      extension: 'https://example.com/test',
      input: z.object({
        text: z.string()
      }),
      execute: async (input) => {
        return { receivedText: input.text }
      }
    })
    
    a2a.register(executor)
    
    const message: Message = {
      kind: 'message',
      messageId: 'test-message',
      role: 'user',
      parts: [{ kind: 'text', text: 'Hello world' }],
      extensions: ['https://example.com/test'],
      metadata: {}
    }
    
    const result = await a2a.execute(message, {
      taskId: 'test-task-id',
      contextId: 'test-context-id'
    })
    expect(result).toEqual({ receivedText: 'Hello world' })
  })

  it('should extract data input from message', async () => {
    const a2a = createA2A()
    
    const executor = defineExecutor({
      extension: 'https://example.com/test',
      input: z.object({
        name: z.string(),
        value: z.number()
      }),
      execute: async (input) => {
        return { received: input }
      }
    })
    
    a2a.register(executor)
    
    const message: Message = {
      kind: 'message',
      messageId: 'test-message',
      role: 'user',
      parts: [{
        kind: 'data',
        data: { name: 'test', value: 42 }
      }],
      extensions: ['https://example.com/test'],
      metadata: {}
    }
    
    const result = await a2a.execute(message, {
      taskId: 'test-task-id',
      contextId: 'test-context-id'
    })
    expect(result).toEqual({ received: { name: 'test', value: 42 } })
  })

  it('should validate output with schema', async () => {
    const a2a = createA2A()
    
    const outputSchema = z.object({
      result: z.string()
    })
    
    const executor = defineExecutor({
      extension: 'https://example.com/test',
      output: outputSchema,
      execute: async () => {
        return { result: 'validated' }
      }
    })
    
    a2a.register(executor)
    
    const message: Message = {
      kind: 'message',
      messageId: 'test-message',
      role: 'user',
      parts: [],
      extensions: ['https://example.com/test'],
      metadata: {}
    }
    
    const result = await a2a.execute(message, {
      taskId: 'test-task-id',
      contextId: 'test-context-id'
    })
    expect(result).toEqual({ result: 'validated' })
  })

  it('should send events through custom event sender', async () => {
    const events: A2AEvent[] = []
    
    const a2a = createA2A({
      events: {
        send: async (event) => {
          events.push(event)
        }
      }
    })
    
    const executor = defineExecutor({
      extension: 'https://example.com/test',
      execute: async (_, context) => {
        await context.updateStatus(context.taskId!, context.contextId!, {
          state: 'working',
          timestamp: new Date().toISOString()
        })
        return { done: true }
      }
    })
    
    a2a.register(executor)
    
    const message: Message = {
      kind: 'message',
      messageId: 'test-message',
      role: 'user',
      parts: [],
      extensions: ['https://example.com/test'],
      metadata: {}
    }
    
    await a2a.execute(message, {
      taskId: 'test-task-id',
      contextId: 'test-context-id'
    })
    
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('status-update')
    // Check it's the correct task ID
    expect(events[0].taskId).toBe('test-task-id')
    expect(events[0].contextId).toBe('test-context-id')
    if (events[0].kind === 'status-update') {
      expect(events[0].status.state).toBe('working')
    }
  })

  it('should handle updateArtifact in executor', async () => {
    const events: A2AEvent[] = []
    
    const a2a = createA2A({
      events: {
        send: async (event) => {
          events.push(event)
        }
      }
    })
    
    const executor = defineExecutor({
      extension: 'https://example.com/test',
      execute: async (_, context) => {
        await context.updateArtifact(context.taskId!, context.contextId!, {
          artifactId: 'test-artifact-id',
          name: 'test.txt',
          description: 'Test file',
          parts: [{
            kind: 'data',
            data: { content: 'Hello world' }
          }]
        })
        return { artifactId: 'test-artifact-id' }
      }
    })
    
    a2a.register(executor)
    
    const message: Message = {
      kind: 'message',
      messageId: 'test-message',
      role: 'user',
      parts: [],
      extensions: ['https://example.com/test'],
      metadata: {}
    }
    
    const result = await a2a.execute(message, {
      taskId: 'test-task-id',
      contextId: 'test-context-id'
    })
    
    expect(events).toHaveLength(1)
    expect(events[0].kind).toBe('artifact-update')
    expect(result).toHaveProperty('artifactId')
  })

  it('should support method chaining for registering executors', () => {
    const a2a = createA2A()
    
    const executor1 = defineExecutor({
      extension: 'https://example.com/executor1',
      execute: async () => ({ id: 1 })
    })
    
    const executor2 = defineExecutor({
      extension: 'https://example.com/executor2',
      execute: async () => ({ id: 2 })
    })
    
    const result = a2a
      .register(executor1)
      .register(executor2)
    
    expect(result).toBe(a2a)
  })
})