/**
 * Redis SSE Integration Tests
 * These tests require a running Redis instance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Redis from 'ioredis'
import { createRedisA2A, createRedisSSEConfig } from '../'
import { memoryAdapter } from '../../../storage/adapters/memory'
import { defineExecutor } from '../../../executor'
import type { A2AEvent } from '../../../types'

// Skip these tests if Redis is not available
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const SKIP_REDIS_TESTS = process.env.SKIP_REDIS_TESTS === 'true'

describe.skipIf(SKIP_REDIS_TESTS)('Redis SSE Integration Tests', () => {
  let redis: Redis
  let testChannelPrefix: string

  beforeEach(async () => {
    // Create unique channel prefix for each test
    testChannelPrefix = `test:${Date.now()}:`
    
    // Test Redis connection
    redis = new Redis(REDIS_URL)
    try {
      await redis.ping()
    } catch (error) {
      console.warn('Redis not available, skipping integration tests')
      return
    }
  })

  afterEach(async () => {
    if (redis) {
      await redis.quit()
    }
  })

  describe('Redis SSE Event Flow', () => {
    it('should publish and receive events through Redis', async () => {
      // Create Redis-enabled A2A instance
      const { a2a } = await createRedisA2A(memoryAdapter(), {
        url: REDIS_URL,
        channelPrefix: testChannelPrefix,
        debug: false
      })

      // Create a test executor
      const testExecutor = defineExecutor({
        extension: 'test',
        execute: async (input: { message: string }, context) => {
          await context.updateStatus('working', 'Processing...')
          await context.updateStatus('completed', 'Done!')
          return { result: `Processed: ${input.message}` }
        }
      })

      a2a.register(testExecutor)

      // Create subscriber to listen for events
      const subscriber = new Redis(REDIS_URL)
      const receivedEvents: A2AEvent[] = []
      
      const taskId = 'test-task-123'
      const channel = `${testChannelPrefix}${taskId}`

      // Subscribe to the task channel
      await subscriber.subscribe(channel)
      
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          receivedEvents.push(JSON.parse(message))
        }
      })

      // Execute the task
      const result = await a2a.execute({
        id: 'msg1',
        role: 'user',
        parts: [
          {
            type: 'text',
            text: 'Hello world'
          }
        ],
        metadata: {
          taskId,
          extension: 'test'
        }
      })

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify events were received
      expect(receivedEvents.length).toBeGreaterThan(0)
      
      // Check for status update events
      const statusEvents = receivedEvents.filter(e => e.type === 'status-update')
      expect(statusEvents.length).toBeGreaterThanOrEqual(2)

      // Verify event structure
      const workingEvent = statusEvents.find(e => e.data.state === 'working')
      expect(workingEvent).toBeDefined()
      expect(workingEvent?.taskId).toBe(taskId)
      expect(workingEvent?.data.message?.parts?.[0]?.text).toBe('Processing...')

      const completedEvent = statusEvents.find(e => e.data.state === 'completed')
      expect(completedEvent).toBeDefined()
      expect(completedEvent?.taskId).toBe(taskId)
      expect(completedEvent?.data.message?.parts?.[0]?.text).toBe('Done!')

      // Verify execution result
      expect(result).toEqual({ result: 'Processed: Hello world' })

      await subscriber.quit()
    })

    it('should handle multiple concurrent tasks', async () => {
      const { a2a } = await createRedisA2A(memoryAdapter(), {
        url: REDIS_URL,
        channelPrefix: testChannelPrefix,
        debug: false
      })

      const testExecutor = defineExecutor({
        extension: 'concurrent',
        execute: async (input: { id: string, delay: number }, context) => {
          await context.updateStatus('working', `Processing task ${input.id}`)
          await new Promise(resolve => setTimeout(resolve, input.delay))
          await context.updateStatus('completed', `Completed task ${input.id}`)
          return { taskId: input.id, processed: true }
        }
      })

      a2a.register(testExecutor)

      // Create subscribers for multiple tasks
      const subscriber1 = new Redis(REDIS_URL)
      const subscriber2 = new Redis(REDIS_URL)
      
      const events1: A2AEvent[] = []
      const events2: A2AEvent[] = []

      const taskId1 = 'concurrent-task-1'
      const taskId2 = 'concurrent-task-2'

      await subscriber1.subscribe(`${testChannelPrefix}${taskId1}`)
      await subscriber2.subscribe(`${testChannelPrefix}${taskId2}`)

      subscriber1.on('message', (channel, message) => {
        if (channel === `${testChannelPrefix}${taskId1}`) {
          events1.push(JSON.parse(message))
        }
      })

      subscriber2.on('message', (channel, message) => {
        if (channel === `${testChannelPrefix}${taskId2}`) {
          events2.push(JSON.parse(message))
        }
      })

      // Execute tasks concurrently
      const [result1, result2] = await Promise.all([
        a2a.execute({
          id: 'msg1',
          role: 'user',
          parts: [{ type: 'text', text: 'Task 1' }],
          metadata: { taskId: taskId1, extension: 'concurrent' }
        }),
        a2a.execute({
          id: 'msg2',
          role: 'user',
          parts: [{ type: 'text', text: 'Task 2' }],
          metadata: { taskId: taskId2, extension: 'concurrent' }
        })
      ])

      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 100))

      // Verify both tasks received events
      expect(events1.length).toBeGreaterThan(0)
      expect(events2.length).toBeGreaterThan(0)

      // Verify task isolation
      const task1Events = events1.filter(e => e.taskId === taskId1)
      const task2Events = events2.filter(e => e.taskId === taskId2)

      expect(task1Events.length).toBe(events1.length)
      expect(task2Events.length).toBe(events2.length)

      // Verify results
      expect(result1).toEqual({ taskId: taskId1, processed: true })
      expect(result2).toEqual({ taskId: taskId2, processed: true })

      await subscriber1.quit()
      await subscriber2.quit()
    })

    it('should handle artifact events', async () => {
      const { a2a } = await createRedisA2A(memoryAdapter(), {
        url: REDIS_URL,
        channelPrefix: testChannelPrefix,
        debug: false
      })

      const artifactExecutor = defineExecutor({
        extension: 'artifact',
        execute: async (input: { content: string }, context) => {
          // Save an artifact
          const artifact = await context.updateArtifact({
            kind: 'text',
            name: 'result.txt',
            description: 'Test artifact',
            data: input.content
          })

          return { artifactId: artifact.id }
        }
      })

      a2a.register(artifactExecutor)

      const subscriber = new Redis(REDIS_URL)
      const receivedEvents: A2AEvent[] = []
      
      const taskId = 'artifact-task-123'
      const channel = `${testChannelPrefix}${taskId}`

      await subscriber.subscribe(channel)
      
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          receivedEvents.push(JSON.parse(message))
        }
      })

      // Execute task
      const result = await a2a.execute({
        id: 'msg1',
        role: 'user',
        parts: [{ type: 'text', text: 'Create artifact' }],
        metadata: { taskId, extension: 'artifact' }
      })

      await new Promise(resolve => setTimeout(resolve, 100))

      // Find artifact event
      const artifactEvent = receivedEvents.find(e => e.type === 'artifact-update')
      expect(artifactEvent).toBeDefined()
      expect(artifactEvent?.taskId).toBe(taskId)
      expect(artifactEvent?.data.artifact.kind).toBe('text')
      expect(artifactEvent?.data.artifact.name).toBe('result.txt')
      expect(artifactEvent?.data.artifact.data).toBe('Create artifact')

      await subscriber.quit()
    })

    it('should handle input required events', async () => {
      const { a2a } = await createRedisA2A(memoryAdapter(), {
        url: REDIS_URL,
        channelPrefix: testChannelPrefix,
        debug: false
      })

      const inputExecutor = defineExecutor({
        extension: 'input',
        execute: async (input: { question: string }, context) => {
          // This will trigger an input-required event
          const response = await context.requireInput({
            question: input.question
          })
          
          return { response }
        }
      })

      a2a.register(inputExecutor)

      const subscriber = new Redis(REDIS_URL)
      const receivedEvents: A2AEvent[] = []
      
      const taskId = 'input-task-123'
      const channel = `${testChannelPrefix}${taskId}`

      await subscriber.subscribe(channel)
      
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          receivedEvents.push(JSON.parse(message))
        }
      })

      // Execute task (this will hang waiting for input, so we'll timeout)
      const executionPromise = a2a.execute({
        id: 'msg1',
        role: 'user',
        parts: [{ type: 'text', text: 'What is your name?' }],
        metadata: { taskId, extension: 'input' }
      })

      // Wait for input-required event
      await new Promise(resolve => setTimeout(resolve, 100))

      // Find input-required event
      const inputEvent = receivedEvents.find(e => e.type === 'input-required')
      expect(inputEvent).toBeDefined()
      expect(inputEvent?.taskId).toBe(taskId)
      expect(inputEvent?.data.question).toBe('What is your name?')

      await subscriber.quit()
    })
  })

  describe('Redis SSE Configuration', () => {
    it('should create Redis SSE config correctly', async () => {
      const { config, nextjsOptions } = await createRedisSSEConfig({
        url: REDIS_URL,
        channelPrefix: testChannelPrefix,
        debug: true
      })

      expect(config.events).toBeDefined()
      expect(config.events?.send).toBeDefined()
      expect(typeof config.events?.send).toBe('function')
      expect(nextjsOptions.sse).toBeDefined()
    })

    it('should handle Redis connection errors gracefully', async () => {
      const invalidRedisUrl = 'redis://invalid:6379'
      
      await expect(createRedisSSEConfig({
        url: invalidRedisUrl,
        channelPrefix: testChannelPrefix
      })).rejects.toThrow()
    })

    it('should use environment variable for Redis URL', async () => {
      // Temporarily set environment variable
      const originalUrl = process.env.REDIS_URL
      process.env.REDIS_URL = REDIS_URL

      try {
        const { config } = await createRedisSSEConfig({
          channelPrefix: testChannelPrefix
        })

        expect(config.events?.send).toBeDefined()
      } finally {
        // Restore original environment variable
        if (originalUrl) {
          process.env.REDIS_URL = originalUrl
        } else {
          delete process.env.REDIS_URL
        }
      }
    })
  })

  describe('Redis Connection Management', () => {
    it('should handle Redis disconnection gracefully', async () => {
      const { a2a } = await createRedisA2A(memoryAdapter(), {
        url: REDIS_URL,
        channelPrefix: testChannelPrefix,
        debug: false
      })

      const testExecutor = defineExecutor({
        extension: 'disconnect',
        execute: async (input: { message: string }, context) => {
          await context.updateStatus('working', 'Before disconnect')
          
          // Simulate Redis disconnection by creating a new Redis instance
          // and immediately disconnecting it
          const tempRedis = new Redis(REDIS_URL)
          await tempRedis.disconnect()
          
          await context.updateStatus('completed', 'After disconnect')
          return { result: 'completed' }
        }
      })

      a2a.register(testExecutor)

      // This should not throw even if Redis has connection issues
      const result = await a2a.execute({
        id: 'msg1',
        role: 'user',
        parts: [{ type: 'text', text: 'Test disconnect' }],
        metadata: { taskId: 'disconnect-task', extension: 'disconnect' }
      })

      expect(result).toEqual({ result: 'completed' })
    })
  })

  describe('Performance Tests', () => {
    it('should handle high-frequency events', async () => {
      const { a2a } = await createRedisA2A(memoryAdapter(), {
        url: REDIS_URL,
        channelPrefix: testChannelPrefix,
        debug: false
      })

      const highFreqExecutor = defineExecutor({
        extension: 'highfreq',
        execute: async (input: { count: number }, context) => {
          for (let i = 0; i < input.count; i++) {
            await context.updateStatus('working', `Processing ${i + 1}/${input.count}`)
          }
          await context.updateStatus('completed', 'All done!')
          return { processed: input.count }
        }
      })

      a2a.register(highFreqExecutor)

      const subscriber = new Redis(REDIS_URL)
      const receivedEvents: A2AEvent[] = []
      
      const taskId = 'highfreq-task'
      const channel = `${testChannelPrefix}${taskId}`

      await subscriber.subscribe(channel)
      
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          receivedEvents.push(JSON.parse(message))
        }
      })

      const eventCount = 50
      const result = await a2a.execute({
        id: 'msg1',
        role: 'user',
        parts: [{ type: 'text', text: `Process ${eventCount} items` }],
        metadata: { taskId, extension: 'highfreq' }
      })

      // Wait for all events
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should have received all events
      expect(receivedEvents.length).toBe(eventCount + 1) // +1 for completed event
      expect(result).toEqual({ processed: eventCount })

      await subscriber.quit()
    })
  })
})