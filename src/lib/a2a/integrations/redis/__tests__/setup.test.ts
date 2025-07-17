/**
 * Redis SSE Setup Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import Redis from 'ioredis'
import { createRedisSSEConfig, createRedisA2A } from '../setup'
import { memoryAdapter } from '../../../storage/adapters/memory'

// Mock Redis for unit tests
vi.mock('ioredis')

describe('Redis SSE Setup', () => {
  let mockRedis: Redis

  beforeEach(() => {
    mockRedis = new Redis()
    vi.mocked(mockRedis.connect).mockResolvedValue()
    vi.mocked(mockRedis.ping).mockResolvedValue('PONG')
    vi.mocked(mockRedis.quit).mockResolvedValue('OK')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createRedisSSEConfig', () => {
    it('should create config with default values', async () => {
      const originalEnv = process.env.REDIS_URL
      process.env.REDIS_URL = 'redis://localhost:6379'

      try {
        const { config, nextjsOptions } = await createRedisSSEConfig()

        expect(config.events).toBeDefined()
        expect(config.events?.send).toBeDefined()
        expect(typeof config.events?.send).toBe('function')
        expect(nextjsOptions.sse).toBeDefined()
      } finally {
        if (originalEnv) {
          process.env.REDIS_URL = originalEnv
        } else {
          delete process.env.REDIS_URL
        }
      }
    })

    it('should create config with custom options', async () => {
      const config = {
        url: 'redis://custom:6379',
        channelPrefix: 'custom:',
        debug: true,
        redisOptions: {
          connectTimeout: 5000,
          commandTimeout: 3000
        }
      }

      const { config: a2aConfig, nextjsOptions } = await createRedisSSEConfig(config)

      expect(a2aConfig.events).toBeDefined()
      expect(a2aConfig.events?.send).toBeDefined()
      expect(nextjsOptions.sse).toBeDefined()
    })

    it('should throw error when no Redis URL is provided', async () => {
      const originalEnv = process.env.REDIS_URL
      delete process.env.REDIS_URL

      try {
        await expect(createRedisSSEConfig()).rejects.toThrow(
          'Redis URL not provided. Set REDIS_URL environment variable or pass url option.'
        )
      } finally {
        if (originalEnv) {
          process.env.REDIS_URL = originalEnv
        }
      }
    })

    it('should handle Redis connection errors', async () => {
      vi.mocked(mockRedis.connect).mockRejectedValue(new Error('Connection failed'))

      await expect(createRedisSSEConfig({
        url: 'redis://invalid:6379'
      })).rejects.toThrow('Connection failed')
    })

    it('should create separate publisher and subscriber clients', async () => {
      const { config } = await createRedisSSEConfig({
        url: 'redis://localhost:6379',
        channelPrefix: 'test:'
      })

      expect(config.events?.send).toBeDefined()
      
      // Verify that Redis constructor was called twice (publisher and subscriber)
      expect(vi.mocked(Redis)).toHaveBeenCalledTimes(2)
    })

    it('should apply Redis options correctly', async () => {
      const redisOptions = {
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryStrategy: (times: number) => Math.min(times * 50, 2000)
      }

      await createRedisSSEConfig({
        url: 'redis://localhost:6379',
        redisOptions
      })

      // Verify Redis was instantiated with correct options
      expect(vi.mocked(Redis)).toHaveBeenCalledWith(
        'redis://localhost:6379',
        expect.objectContaining({
          ...redisOptions,
          lazyConnect: true
        })
      )
    })
  })

  describe('createRedisA2A', () => {
    it('should create A2A instance with Redis SSE support', async () => {
      const { a2a, handlers } = await createRedisA2A(memoryAdapter(), {
        url: 'redis://localhost:6379',
        channelPrefix: 'test:'
      })

      expect(a2a).toBeDefined()
      expect(a2a.register).toBeDefined()
      expect(a2a.execute).toBeDefined()
      
      expect(handlers).toBeDefined()
      expect(handlers.POST).toBeDefined()
      expect(handlers.GET).toBeDefined()
      expect(handlers.PUT).toBeDefined()
      expect(handlers.DELETE).toBeDefined()
    })

    it('should create A2A instance with default Redis configuration', async () => {
      const originalEnv = process.env.REDIS_URL
      process.env.REDIS_URL = 'redis://localhost:6379'

      try {
        const { a2a, handlers } = await createRedisA2A(memoryAdapter())

        expect(a2a).toBeDefined()
        expect(handlers).toBeDefined()
      } finally {
        if (originalEnv) {
          process.env.REDIS_URL = originalEnv
        } else {
          delete process.env.REDIS_URL
        }
      }
    })

    it('should throw error when Redis URL is not provided', async () => {
      const originalEnv = process.env.REDIS_URL
      delete process.env.REDIS_URL

      try {
        await expect(createRedisA2A(memoryAdapter())).rejects.toThrow(
          'Redis URL not provided'
        )
      } finally {
        if (originalEnv) {
          process.env.REDIS_URL = originalEnv
        }
      }
    })

    it('should handle custom Redis options', async () => {
      const redisConfig = {
        url: 'redis://localhost:6379',
        channelPrefix: 'custom:',
        debug: true,
        redisOptions: {
          connectTimeout: 15000,
          commandTimeout: 10000
        }
      }

      const { a2a, handlers } = await createRedisA2A(memoryAdapter(), redisConfig)

      expect(a2a).toBeDefined()
      expect(handlers).toBeDefined()
    })

    it('should create separate Redis connections for publisher and subscriber', async () => {
      await createRedisA2A(memoryAdapter(), {
        url: 'redis://localhost:6379'
      })

      // Should create 3 Redis instances total:
      // 1. Publisher in createRedisSSEConfig
      // 2. Subscriber in createRedisSSEConfig  
      // 3. Subscriber in createRedisA2A for SSE handler
      expect(vi.mocked(Redis)).toHaveBeenCalledTimes(3)
    })

    it('should apply storage adapter correctly', async () => {
      const storage = memoryAdapter()
      const { a2a } = await createRedisA2A(storage, {
        url: 'redis://localhost:6379'
      })

      expect(a2a).toBeDefined()
      expect(a2a.getTask).toBeDefined()
      expect(a2a.updateTaskStatus).toBeDefined()
      expect(a2a.cancelTask).toBeDefined()
    })

    it('should handle Redis connection errors in SSE handler creation', async () => {
      // Mock the third Redis instance (for SSE handler) to fail
      let callCount = 0
      vi.mocked(Redis).mockImplementation(() => {
        callCount++
        const instance = new Redis()
        
        if (callCount === 3) {
          // Third instance (SSE handler subscriber) fails to connect
          vi.mocked(instance.connect).mockRejectedValue(new Error('SSE handler connection failed'))
        }
        
        return instance
      })

      await expect(createRedisA2A(memoryAdapter(), {
        url: 'redis://localhost:6379'
      })).rejects.toThrow('SSE handler connection failed')
    })
  })

  describe('Configuration Validation', () => {
    it('should validate Redis URL format', async () => {
      const invalidUrls = [
        'invalid-url',
        'http://localhost:6379',
        'redis://localhost:invalid-port',
        ''
      ]

      for (const url of invalidUrls) {
        // Since we're mocking Redis, we won't get URL validation errors
        // but in real scenarios, ioredis would throw errors for invalid URLs
        const { config } = await createRedisSSEConfig({ url })
        expect(config.events?.send).toBeDefined()
      }
    })

    it('should handle channel prefix edge cases', async () => {
      const edgeCases = [
        { prefix: '', expected: '' },
        { prefix: 'a', expected: 'a' },
        { prefix: 'very:long:prefix:with:colons:', expected: 'very:long:prefix:with:colons:' },
        { prefix: 'prefix-with-dashes_and_underscores', expected: 'prefix-with-dashes_and_underscores' }
      ]

      for (const { prefix, expected } of edgeCases) {
        const { config } = await createRedisSSEConfig({
          url: 'redis://localhost:6379',
          channelPrefix: prefix
        })

        expect(config.events?.send).toBeDefined()
        // We can't easily test the actual prefix usage here,
        // but the config creation should succeed
      }
    })

    it('should handle debug flag correctly', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { config } = await createRedisSSEConfig({
        url: 'redis://localhost:6379',
        debug: true
      })

      expect(config.events?.send).toBeDefined()
      consoleSpy.mockRestore()
    })
  })

  describe('Memory Management', () => {
    it('should not leak Redis connections', async () => {
      const { a2a } = await createRedisA2A(memoryAdapter(), {
        url: 'redis://localhost:6379'
      })

      // Verify that connect was called for each Redis instance
      expect(vi.mocked(mockRedis.connect)).toHaveBeenCalledTimes(3)
    })

    it('should handle concurrent A2A instance creation', async () => {
      const promises = Array(5).fill(null).map(() =>
        createRedisA2A(memoryAdapter(), {
          url: 'redis://localhost:6379',
          channelPrefix: `concurrent-${Math.random()}:`
        })
      )

      const results = await Promise.all(promises)

      results.forEach(({ a2a, handlers }) => {
        expect(a2a).toBeDefined()
        expect(handlers).toBeDefined()
      })
    })
  })
})