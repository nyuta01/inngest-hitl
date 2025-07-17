# Redis SSE Integration Tests

This directory contains comprehensive tests for the Redis SSE integration.

## Test Files

### `redis-sse.test.ts`
Unit tests for Redis SSE components:
- Event sender functionality
- SSE handler creation and configuration
- Error handling
- Message serialization
- Debug logging

### `integration.test.ts`
Integration tests that require a running Redis instance:
- Full event flow from publisher to subscriber
- Multiple concurrent tasks
- Artifact and input-required events
- Performance tests with high-frequency events
- Redis connection management
- Configuration validation

### `setup.test.ts`
Tests for Redis SSE setup utilities:
- `createRedisSSEConfig` function
- `createRedisA2A` function
- Configuration validation
- Memory management
- Error handling

## Running Tests

### Unit Tests Only
```bash
# Run unit tests (no Redis required)
pnpm test src/lib/a2a/integrations/redis/__tests__/redis-sse.test.ts
pnpm test src/lib/a2a/integrations/redis/__tests__/setup.test.ts
```

### Integration Tests
```bash
# Start Redis (required for integration tests)
docker run -d -p 6379:6379 --name redis-test redis:alpine

# Run integration tests
pnpm test src/lib/a2a/integrations/redis/__tests__/integration.test.ts

# Clean up
docker stop redis-test && docker rm redis-test
```

### All Tests
```bash
# Run all Redis SSE tests
pnpm test src/lib/a2a/integrations/redis/__tests__/
```

## Environment Configuration

### Required Environment Variables
```bash
# For integration tests
REDIS_URL=redis://localhost:6379

# To skip integration tests when Redis is not available
SKIP_REDIS_TESTS=true
```

### Docker Compose for Testing
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  redis-test:
    image: redis:alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
```

## Test Coverage

The tests cover the following scenarios:

### Event Publishing
- ✅ Correct channel naming with prefixes
- ✅ Message serialization and deserialization
- ✅ Complex event data structures
- ✅ Error handling for publish failures
- ✅ Debug logging

### SSE Streaming
- ✅ SSE stream creation and headers
- ✅ Redis subscription management
- ✅ Message filtering by channel
- ✅ Connection cleanup on client disconnect
- ✅ Request validation (task ID required)

### Configuration
- ✅ Default configuration values
- ✅ Custom Redis options
- ✅ Environment variable usage
- ✅ URL validation
- ✅ Channel prefix handling

### Integration Scenarios
- ✅ End-to-end event flow
- ✅ Multiple concurrent tasks
- ✅ Different event types (status, artifact, input)
- ✅ High-frequency event handling
- ✅ Redis connection management
- ✅ Task isolation

### Error Handling
- ✅ Redis connection failures
- ✅ Invalid configuration
- ✅ Network interruptions
- ✅ Malformed messages
- ✅ Subscription errors

## Mock Strategy

### Unit Tests
- Uses `vi.mock('ioredis')` to mock Redis operations
- Focuses on logic and data flow
- Tests configuration and validation
- Verifies correct Redis method calls

### Integration Tests
- Uses real Redis instance
- Tests actual pub/sub functionality
- Verifies event timing and ordering
- Tests concurrent operations
- Validates performance characteristics

## Performance Considerations

### Test Performance
- Unit tests: ~50ms per test
- Integration tests: ~200ms per test (depends on Redis)
- Total suite: ~2-3 seconds

### Redis Resource Usage
- Each integration test uses a unique channel prefix
- Channels are automatically cleaned up after tests
- Redis memory usage is minimal for testing

## Debugging Tests

### Enable Debug Logging
```bash
# Run tests with Redis debug logging
DEBUG=redis pnpm test src/lib/a2a/integrations/redis/__tests__/
```

### Test-Specific Debug
```typescript
// In test files, enable debug mode
const { a2a } = await createRedisA2A(memoryAdapter(), {
  url: REDIS_URL,
  debug: true  // Enable debug logging
})
```

### Redis CLI for Manual Testing
```bash
# Monitor Redis activity
redis-cli monitor

# Check active channels
redis-cli pubsub channels "a2a:task:*"

# Subscribe to specific channel
redis-cli subscribe "a2a:task:test-task-123"
```

## Common Issues

### Redis Connection Refused
**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:6379`
**Solution**: Start Redis server or set `SKIP_REDIS_TESTS=true`

### Tests Hang on CI
**Problem**: Integration tests hang in CI environment
**Solution**: Use `SKIP_REDIS_TESTS=true` or provide Redis service

### Memory Leaks
**Problem**: Tests consume increasing memory
**Solution**: Ensure Redis clients are properly cleaned up with `quit()`

### Flaky Tests
**Problem**: Integration tests sometimes fail
**Solution**: Increase timeout values or add proper event waiting

## Test Examples

### Basic Unit Test
```typescript
it('should publish events to correct channels', async () => {
  const eventSender = createRedisSSEEventSender({
    publisher: mockRedis,
    channelPrefix: 'test:',
    debug: false
  })

  await eventSender(event)

  expect(mockRedis.publish).toHaveBeenCalledWith(
    'test:task123',
    JSON.stringify(event)
  )
})
```

### Basic Integration Test
```typescript
it('should receive events through Redis', async () => {
  const { a2a } = await createRedisA2A(memoryAdapter(), {
    url: REDIS_URL,
    channelPrefix: 'test:'
  })

  const subscriber = new Redis(REDIS_URL)
  const events: A2AEvent[] = []

  await subscriber.subscribe('test:task123')
  subscriber.on('message', (channel, message) => {
    events.push(JSON.parse(message))
  })

  await a2a.execute(message)
  await new Promise(resolve => setTimeout(resolve, 100))

  expect(events.length).toBeGreaterThan(0)
})
```

## Contributing

When adding new tests:

1. **Unit tests** for new functions or logic
2. **Integration tests** for new Redis features
3. **Error handling** for edge cases
4. **Performance tests** for high-load scenarios
5. **Documentation** for complex test scenarios

Follow the existing patterns and ensure tests are:
- ✅ Isolated (no shared state)
- ✅ Deterministic (consistent results)
- ✅ Fast (quick feedback)
- ✅ Clear (easy to understand)
- ✅ Comprehensive (good coverage)