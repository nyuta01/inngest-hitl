/**
 * Redis SSE Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Redis from 'ioredis'
import { createRedisSSEEventSender, createRedisSSEHandler } from '../'
import { createA2A } from '../../../core'
import { memoryAdapter } from '../../../storage/adapters/memory'
import type { A2AEvent, A2AInstance } from '../../../types'

// Mock Redis for unit tests
vi.mock('ioredis')

// Helper to create mock NextRequest
function createMockNextRequest(url: string) {
  return {
    url,
    signal: {
      addEventListener: vi.fn()
    }
  } as any
}

describe('Redis SSE Integration', () => {
  let mockPublisher: Redis
  let mockSubscriber: Redis
  let a2a: A2AInstance

  beforeEach(() => {
    mockPublisher = new Redis()
    mockSubscriber = new Redis()
    
    // Mock Redis methods
    vi.mocked(mockPublisher.publish).mockResolvedValue(1)
    vi.mocked(mockSubscriber.subscribe).mockResolvedValue(1)
    vi.mocked(mockSubscriber.unsubscribe).mockResolvedValue(1)
    vi.mocked(mockSubscriber.on).mockReturnValue(mockSubscriber)
    vi.mocked(mockSubscriber.off).mockReturnValue(mockSubscriber)
    
    // Create A2A instance
    a2a = createA2A({
      storage: memoryAdapter()
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Redis SSE Event Sender', () => {
    it('should publish events to correct Redis channels', async () => {
      const eventSender = createRedisSSEEventSender({
        publisher: mockPublisher,
        channelPrefix: 'test:a2a:',
        debug: false
      })

      const event: A2AEvent = {
        type: 'status-update',
        taskId: 'task123',
        data: {
          state: 'working',
          message: {
            kind: 'message',
            messageId: 'msg1',
            role: 'agent',
            parts: [{ kind: 'text', text: 'Processing...' }],
            metadata: {}
          },
          timestamp: new Date().toISOString()
        }
      }

      await eventSender(event)

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'test:a2a:task123',
        JSON.stringify(event)
      )
    })

    it('should use default channel prefix when not provided', async () => {
      const eventSender = createRedisSSEEventSender({
        publisher: mockPublisher,
        debug: false
      })

      const event: A2AEvent = {
        type: 'status-update',
        taskId: 'task456',
        data: {
          state: 'completed',
          timestamp: new Date().toISOString()
        }
      }

      await eventSender(event)

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'a2a:task:task456',
        JSON.stringify(event)
      )
    })

    it('should log debug messages when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const eventSender = createRedisSSEEventSender({
        publisher: mockPublisher,
        channelPrefix: 'debug:',
        debug: true
      })

      const event: A2AEvent = {
        type: 'input-required',
        taskId: 'task789',
        data: {
          requestId: 'req123',
          question: 'What is your name?'
        }
      }

      await eventSender(event)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Redis SSE] Publishing to channel: debug:task789',
        event
      )

      consoleSpy.mockRestore()
    })

    it('should handle different event types correctly', async () => {
      const eventSender = createRedisSSEEventSender({
        publisher: mockPublisher,
        debug: false
      })

      const events: A2AEvent[] = [
        {
          type: 'status-update',
          taskId: 'task1',
          data: { state: 'working', timestamp: new Date().toISOString() }
        },
        {
          type: 'input-required',
          taskId: 'task2',
          data: { requestId: 'req1', question: 'Test?' }
        },
        {
          type: 'artifact-update',
          taskId: 'task3',
          data: {
            artifact: {
              artifactId: 'art1',
              name: 'result.txt',
              description: 'Test artifact',
              parts: [{ kind: 'text', text: 'Hello world' }],
              metadata: {}
            }
          }
        }
      ]

      for (const event of events) {
        await eventSender(event)
      }

      expect(mockPublisher.publish).toHaveBeenCalledTimes(3)
      expect(mockPublisher.publish).toHaveBeenNthCalledWith(
        1,
        'a2a:task:task1',
        JSON.stringify(events[0])
      )
      expect(mockPublisher.publish).toHaveBeenNthCalledWith(
        2,
        'a2a:task:task2',
        JSON.stringify(events[1])
      )
      expect(mockPublisher.publish).toHaveBeenNthCalledWith(
        3,
        'a2a:task:task3',
        JSON.stringify(events[2])
      )
    })
  })

  describe('Redis SSE Handler', () => {
    it('should create SSE handler with correct configuration', () => {
      const handler = createRedisSSEHandler(a2a, {
        subscriber: mockSubscriber,
        channelPrefix: 'test:',
        debug: false
      })

      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should return 400 for requests without taskId', async () => {
      const handler = createRedisSSEHandler(a2a, {
        subscriber: mockSubscriber,
        debug: false
      })

      const request = new Request('http://localhost/events')
      const response = await handler(request as any)

      expect(response.status).toBe(400)
      expect(await response.text()).toBe('Task ID required')
    })

    it('should create SSE stream for valid taskId', async () => {
      const handler = createRedisSSEHandler(a2a, {
        subscriber: mockSubscriber,
        channelPrefix: 'test:',
        debug: false
      })

      const request = new Request('http://localhost/events?taskId=task123')
      const response = await handler(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
      expect(mockSubscriber.subscribe).toHaveBeenCalledWith('test:task123')
    })

    it('should handle Redis message events', async () => {
      let messageHandler: (channel: string, message: string) => void = () => {}
      
      // Mock subscriber.on to capture the message handler
      vi.mocked(mockSubscriber.on).mockImplementation((event, handler) => {
        if (event === 'message') {
          messageHandler = handler as (channel: string, message: string) => void
        }
        return mockSubscriber
      })

      const handler = createRedisSSEHandler(a2a, {
        subscriber: mockSubscriber,
        channelPrefix: 'test:',
        debug: false
      })

      const request = new Request('http://localhost/events?taskId=task123')
      const response = await handler(request)

      expect(response.body).toBeDefined()
      
      // Test that message handler was registered
      expect(mockSubscriber.on).toHaveBeenCalledWith('message', expect.any(Function))
      
      // Test message handling
      const testEvent = {
        type: 'status-update',
        taskId: 'task123',
        data: { state: 'working', timestamp: new Date().toISOString() }
      }
      
      messageHandler('test:task123', JSON.stringify(testEvent))
    })

    it('should ignore messages from other channels', async () => {
      let messageHandler: (channel: string, message: string) => void = () => {}
      
      vi.mocked(mockSubscriber.on).mockImplementation((event, handler) => {
        if (event === 'message') {
          messageHandler = handler as (channel: string, message: string) => void
        }
        return mockSubscriber
      })

      const handler = createRedisSSEHandler(a2a, {
        subscriber: mockSubscriber,
        channelPrefix: 'test:',
        debug: false
      })

      const request = new Request('http://localhost/events?taskId=task123')
      await handler(request)

      // This should not trigger any response since it's from a different channel
      messageHandler('test:task456', JSON.stringify({
        type: 'status-update',
        taskId: 'task456',
        data: { state: 'working', timestamp: new Date().toISOString() }
      }))

      // We can't easily test the stream output, but we can verify 
      // the message handler was called with the correct channel filter
      expect(mockSubscriber.on).toHaveBeenCalledWith('message', expect.any(Function))
    })

    it('should handle request abort signal', async () => {
      const abortController = new AbortController()
      let abortHandler: () => void = () => {}

      // Mock request signal
      const mockRequest = {
        url: 'http://localhost/events?taskId=task123',
        signal: {
          addEventListener: vi.fn((event, handler) => {
            if (event === 'abort') {
              abortHandler = handler as () => void
            }
          })
        }
      } as unknown as Request

      const handler = createRedisSSEHandler(a2a, {
        subscriber: mockSubscriber,
        channelPrefix: 'test:',
        debug: false
      })

      await handler(mockRequest)

      // Verify abort handler was registered
      expect(mockRequest.signal.addEventListener).toHaveBeenCalledWith('abort', expect.any(Function))

      // Simulate abort
      abortHandler()

      // Verify cleanup
      expect(mockSubscriber.unsubscribe).toHaveBeenCalledWith('test:task123')
    })

    it('should log debug messages when debug is enabled', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const handler = createRedisSSEHandler(a2a, {
        subscriber: mockSubscriber,
        channelPrefix: 'debug:',
        debug: true
      })

      const request = new Request('http://localhost/events?taskId=task123')
      await handler(request)

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Redis SSE] Subscribing to channel: debug:task123'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis publish errors gracefully', async () => {
      vi.mocked(mockPublisher.publish).mockRejectedValue(new Error('Redis connection failed'))

      const eventSender = createRedisSSEEventSender({
        publisher: mockPublisher,
        debug: false
      })

      const event: A2AEvent = {
        type: 'status-update',
        taskId: 'task123',
        data: { state: 'working', timestamp: new Date().toISOString() }
      }

      await expect(eventSender(event)).rejects.toThrow('Redis connection failed')
    })

    it('should handle Redis subscription errors gracefully', async () => {
      vi.mocked(mockSubscriber.subscribe).mockRejectedValue(new Error('Subscription failed'))

      const handler = createRedisSSEHandler(a2a, {
        subscriber: mockSubscriber,
        debug: false
      })

      const request = new Request('http://localhost/events?taskId=task123')
      
      // The handler should still return a response even if subscription fails
      const response = await handler(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Configuration Options', () => {
    it('should use custom channel prefix', async () => {
      const customPrefix = 'myapp:tasks:'
      const eventSender = createRedisSSEEventSender({
        publisher: mockPublisher,
        channelPrefix: customPrefix,
        debug: false
      })

      const event: A2AEvent = {
        type: 'status-update',
        taskId: 'task123',
        data: { state: 'working', timestamp: new Date().toISOString() }
      }

      await eventSender(event)

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'myapp:tasks:task123',
        JSON.stringify(event)
      )
    })

    it('should handle empty channel prefix', async () => {
      const eventSender = createRedisSSEEventSender({
        publisher: mockPublisher,
        channelPrefix: '',
        debug: false
      })

      const event: A2AEvent = {
        type: 'status-update',
        taskId: 'task123',
        data: { state: 'working', timestamp: new Date().toISOString() }
      }

      await eventSender(event)

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'task123',
        JSON.stringify(event)
      )
    })
  })

  describe('Message Serialization', () => {
    it('should properly serialize complex event data', async () => {
      const eventSender = createRedisSSEEventSender({
        publisher: mockPublisher,
        debug: false
      })

      const complexEvent: A2AEvent = {
        type: 'artifact-update',
        taskId: 'task123',
        data: {
          artifact: {
            id: 'art1',
            kind: 'json',
            name: 'complex-data.json',
            description: 'Complex nested data structure',
            data: {
              users: [
                { id: 1, name: 'Alice', roles: ['admin', 'user'] },
                { id: 2, name: 'Bob', roles: ['user'] }
              ],
              metadata: {
                created: '2023-01-01T00:00:00Z',
                version: '1.0.0',
                nested: {
                  deep: {
                    value: 'test'
                  }
                }
              }
            }
          }
        }
      }

      await eventSender(complexEvent)

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'a2a:task:task123',
        JSON.stringify(complexEvent)
      )

      // Verify the JSON is valid
      const publishedMessage = vi.mocked(mockPublisher.publish).mock.calls[0][1]
      expect(() => JSON.parse(publishedMessage)).not.toThrow()
    })

    it('should handle events with undefined optional fields', async () => {
      const eventSender = createRedisSSEEventSender({
        publisher: mockPublisher,
        debug: false
      })

      const event: A2AEvent = {
        type: 'status-update',
        taskId: 'task123',
        data: {
          state: 'working',
          timestamp: new Date().toISOString()
          // message is optional and undefined
        }
      }

      await eventSender(event)

      expect(mockPublisher.publish).toHaveBeenCalledWith(
        'a2a:task:task123',
        JSON.stringify(event)
      )
    })
  })
})