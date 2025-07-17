/**
 * Tests for executor module
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineExecutor } from '../executor'
import type { ExecutorContext } from '../types'

describe('defineExecutor', () => {
  it('should create an executor with correct properties', () => {
    const extension = 'https://example.com/test'
    const executor = defineExecutor({
      extension,
      execute: async () => {
        return { result: 'test' }
      }
    })

    expect(executor.extension).toBe(extension)
    expect(executor.execute).toBeDefined()
    expect(executor.input).toBeUndefined()
    expect(executor.output).toBeUndefined()
  })

  it('should create an executor with input schema', () => {
    const inputSchema = z.object({
      name: z.string(),
      age: z.number()
    })

    const executor = defineExecutor({
      extension: 'https://example.com/test',
      input: inputSchema,
      execute: async (input) => {
        // Type should be inferred from schema
        const name: string = input.name
        const age: number = input.age
        return { greeting: `Hello ${name}, age ${age}` }
      }
    })

    expect(executor.input).toBe(inputSchema)
  })

  it('should create an executor with output schema', () => {
    const outputSchema = z.object({
      result: z.string(),
      timestamp: z.string()
    })

    const executor = defineExecutor({
      extension: 'https://example.com/test',
      output: outputSchema,
      execute: async () => {
        return {
          result: 'success',
          timestamp: new Date().toISOString()
        }
      }
    })

    expect(executor.output).toBe(outputSchema)
  })

  it('should create an executor with both input and output schemas', () => {
    const inputSchema = z.object({
      text: z.string()
    })

    const outputSchema = z.object({
      processedText: z.string(),
      length: z.number()
    })

    const executor = defineExecutor({
      extension: 'https://example.com/test',
      input: inputSchema,
      output: outputSchema,
      execute: async (input) => {
        return {
          processedText: input.text.toUpperCase(),
          length: input.text.length
        }
      }
    })

    expect(executor.input).toBe(inputSchema)
    expect(executor.output).toBe(outputSchema)
  })

  it('should handle executor with context usage', async () => {
    const executor = defineExecutor({
      extension: 'https://example.com/test',
      execute: async (_, context) => {
        // Verify context has expected properties
        expect(context.message).toBeDefined()
        expect(context.taskId).toBeDefined()
        expect(context.updateStatus).toBeDefined()
        expect(context.requireInput).toBeDefined()
        expect(context.updateArtifact).toBeDefined()
        expect(context.getTask).toBeDefined()

        return { success: true }
      }
    })

    // Create mock context
    const mockContext: ExecutorContext = {
      message: {
        kind: 'message',
        messageId: 'test-id',
        parts: [],
        role: 'user',
        metadata: {}
      },
      taskId: 'test-task-id',
      updateStatus: async () => {},
      requireInput: async () => 'request-id',
      updateArtifact: async () => ({
        artifactId: 'test-artifact',
        parts: [],
        metadata: {}
      }),
      getTask: async () => ({
        contextId: 'test-context',
        id: 'test-task-id',
        kind: 'task',
        status: {
          state: 'working'
        },
        metadata: {}
      })
    }

    const result = await executor.execute({}, mockContext)
    expect(result).toEqual({ success: true })
  })
})