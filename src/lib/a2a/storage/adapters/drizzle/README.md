# Drizzle Storage Adapter for A2A Protocol

This adapter provides persistent storage for A2A (Agent-to-Agent) tasks using Drizzle ORM with support for both SQLite and PostgreSQL.

## Features

- **Persistent Storage**: Data survives application restarts
- **Multi-Database Support**: SQLite and PostgreSQL
- **Drizzle ORM**: Type-safe database operations
- **Multi-instance Support**: Can be used with remote databases (Turso, Neon, Supabase)
- **Schema Management**: Works with existing database schemas
- **Full A2A Compliance**: Supports all A2A specification features
- **Type-Safe Implementation**: Uses TypeScript generics for compile-time safety
- **Schema-Based Configuration**: Explicit schema configuration for better control
- **UUID Support**: All database IDs are generated as proper UUIDs for uniqueness

## Installation

The required dependencies are already included in the project:

```bash
# For SQLite
pnpm add drizzle-orm @libsql/client

# For PostgreSQL
pnpm add drizzle-orm pg
pnpm add -D @types/pg

# Development
pnpm add -D drizzle-kit
```

## Usage

### Basic Usage

```typescript
import { createA2A, drizzleAdapter } from '@/lib/a2a'
import { db } from '@/db'
import * as schema from '@/db/schema'

// Create A2A instance with Drizzle storage
const a2a = createA2A({
  storage: drizzleAdapter(db, {
    provider: 'sqlite', // or 'pg'
    schema: {
      tasks: schema.tasks,
      messages: schema.messages,
      artifacts: schema.artifacts,
      taskMessages: schema.taskMessages,
    },
  })
})
```

### Configuration Options

#### SQLite with Existing Database

```typescript
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { drizzleAdapter } from '@/lib/a2a'
import * as schema from '@/db/schema'

const client = createClient({
  url: 'file:./data/a2a.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const db = drizzle(client, { schema })

// Option 1: Auto-detect schema from db instance
const adapter = drizzleAdapter(db, {
  provider: 'sqlite'
})

// Option 2: Explicit schema (recommended)
const adapter = drizzleAdapter(db, {
  provider: 'sqlite',
  schema: {
    tasks: schema.tasks,
    messages: schema.messages,
    artifacts: schema.artifacts,
    taskMessages: schema.taskMessages,
  },
})
```

#### PostgreSQL with Existing Database

```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { drizzleAdapter } from '@/lib/a2a'
import * as schema from '@/db/schema'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const db = drizzle(pool, { schema })

const adapter = drizzleAdapter(db, {
  provider: 'pg',
  schema: {
    tasks: schema.tasks,
    messages: schema.messages,
    artifacts: schema.artifacts,
    taskMessages: schema.taskMessages,
  },
})
```

## Database Schema

The adapter automatically creates the following tables:

### Tasks Table
- `id`: Primary key, task identifier
- `kind`: Task type (always 'task')
- `status`: JSON serialized task status
- `status_state`: Current task state for indexing
- `status_message`: JSON serialized status message
- `context_id`: Task context identifier
- `metadata`: JSON serialized metadata
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Messages Table
- `id`: Primary key, composite of task_id and message_id
- `task_id`: Reference to tasks table
- `kind`: Message type (always 'message')
- `message_id`: A2A message identifier
- `role`: Message role (user, agent, system)
- `parts`: JSON serialized message parts
- `context_id`: Message context identifier
- `extensions`: JSON serialized extensions
- `metadata`: JSON serialized metadata
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Artifacts Table
- `id`: Primary key, composite of task_id and artifact_id
- `task_id`: Reference to tasks table
- `artifact_id`: A2A artifact identifier
- `name`: Artifact name
- `description`: Artifact description
- `parts`: JSON serialized artifact parts
- `extensions`: JSON serialized extensions
- `metadata`: JSON serialized metadata
- `created_at`: Timestamp
- `updated_at`: Timestamp

### Task Messages Table
- `task_id`: Reference to tasks table
- `message_id`: Reference to messages table
- `sequence`: Message order within task
- `created_at`: Timestamp

## Performance Considerations

### Indexing
The adapter automatically creates indexes for:
- Message lookups by task ID
- Artifact lookups by task ID
- Message ordering within tasks

### WAL Mode
For local SQLite files, enable WAL mode for better performance:

```typescript
const adapter = await createDrizzleAdapter({
  url: './data/a2a.db',
  options: {
    walMode: true
  }
})
```

### Connection Pooling
For high-throughput scenarios, consider using connection pooling:

```typescript
const adapter = await createDrizzleAdapter({
  url: './data/a2a.db',
  options: {
    timeout: 10000
  }
})
```

## Migration Guide

### From Old Drizzle Adapter (v1)
```typescript
// Before
const adapter = await createDrizzleAdapter({
  url: './data/a2a.db',
})

// After
import { db } from '@/db'
import * as schema from '@/db/schema'

const adapter = drizzleAdapter(db, {
  provider: 'sqlite',
  schema: {
    tasks: schema.tasks,
    messages: schema.messages,
    artifacts: schema.artifacts,
    taskMessages: schema.taskMessages,
  },
})
```

### From Memory Adapter
```typescript
// Before
import { createA2A, memoryAdapter } from '@/lib/a2a'

const a2a = createA2A({
  storage: memoryAdapter()
})

// After
import { createA2A, drizzleAdapter } from '@/lib/a2a'
import { db } from '@/db'
import * as schema from '@/db/schema'

const a2a = createA2A({
  storage: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      tasks: schema.tasks,
      messages: schema.messages,
      artifacts: schema.artifacts,
      taskMessages: schema.taskMessages,
    },
  })
})
```

## Environment Configuration

### Environment Variables
```bash
# Local SQLite
DATABASE_URL=./data/a2a.db

# Turso
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Debug
DATABASE_DEBUG=true
```

### Using Environment Variables
```typescript
const adapter = await createDrizzleAdapter({
  url: process.env.DATABASE_URL || './data/a2a.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
  debug: process.env.DATABASE_DEBUG === 'true'
})
```

## Error Handling

The adapter includes comprehensive error handling:

```typescript
try {
  const adapter = await createDrizzleAdapter({
    url: './data/a2a.db'
  })
  
  // Use adapter
  await adapter.saveTask(task)
} catch (error) {
  console.error('Database error:', error)
  // Handle error appropriately
}
```

## Production Deployment

### Local SQLite
```typescript
const adapter = await createDrizzleAdapter({
  url: './data/a2a.db',
  options: {
    walMode: true,
    timeout: 5000
  }
})
```

### Turso (Recommended for Production)
```typescript
const adapter = await tursoAdapter(
  process.env.TURSO_DATABASE_URL!,
  process.env.TURSO_AUTH_TOKEN!
)
```

## Backup and Recovery

### SQLite Backup
```bash
# Create backup
sqlite3 ./data/a2a.db ".backup ./backups/a2a-backup-$(date +%Y%m%d).db"

# Restore from backup
sqlite3 ./data/a2a.db ".restore ./backups/a2a-backup-20240101.db"
```

### Turso Backup
Turso provides automatic backups and point-in-time recovery through their dashboard.

## Monitoring

### Database Size
```typescript
import { stat } from 'fs/promises'

async function getDatabaseSize() {
  const stats = await stat('./data/a2a.db')
  return stats.size
}
```

### Query Performance
Enable debug logging to monitor query performance:

```typescript
const adapter = await createDrizzleAdapter({
  url: './data/a2a.db',
  debug: true
})
```

## Testing

### Unit Tests
```typescript
import { memoryDrizzleAdapter } from '@/lib/a2a'

describe('My A2A Tests', () => {
  let adapter: StorageAdapter

  beforeEach(async () => {
    adapter = await memoryDrizzleAdapter()
  })

  it('should save and retrieve tasks', async () => {
    const task = { /* task data */ }
    await adapter.saveTask(task)
    const retrieved = await adapter.getTask(task.id)
    expect(retrieved).toEqual(task)
  })
})
```

### Integration Tests
```typescript
import { createDrizzleAdapter } from '@/lib/a2a'

describe('Database Integration', () => {
  let adapter: StorageAdapter

  beforeEach(async () => {
    adapter = await createDrizzleAdapter({
      url: ':memory:'
    })
  })

  // Test with real database operations
})
```

## Troubleshooting

### Common Issues

#### Database Locked
```
Error: database is locked
```
**Solution**: Ensure only one connection is accessing the database, or enable WAL mode.

#### Permission Denied
```
Error: SQLITE_CANTOPEN: unable to open database file
```
**Solution**: Check file permissions and ensure the directory exists.

#### Connection Timeout
```
Error: Connection timeout
```
**Solution**: Increase timeout in configuration or check network connectivity for remote databases.

## Best Practices

1. **Use WAL Mode**: Enable WAL mode for better performance with local SQLite
2. **Proper Error Handling**: Always handle database errors gracefully
3. **Connection Management**: Close connections when done
4. **Backup Strategy**: Implement regular backups for production
5. **Monitoring**: Monitor database size and performance
6. **Testing**: Use in-memory databases for testing

## API Reference

### DrizzleStorageAdapter

#### Constructor
```typescript
new DrizzleStorageAdapter(client: Client)
```

#### Methods
- `initialize(): Promise<void>` - Initialize database schema
- `saveTask(task: Task): Promise<void>` - Save a task
- `getTask(taskId: string): Promise<Task | null>` - Get a task by ID
- `updateTaskStatus(taskId: string, status: TaskStatus): Promise<void>` - Update task status
- `saveMessage(taskId: string, message: Message): Promise<void>` - Save a message
- `getMessages(taskId: string): Promise<Message[]>` - Get messages for a task
- `updateArtifact(artifact: Artifact & { taskId: string }): Promise<void>` - Save an artifact
- `getArtifact(artifactId: string): Promise<Artifact | null>` - Get an artifact by ID
- `getTaskArtifacts(taskId: string): Promise<Artifact[]>` - Get artifacts for a task
- `getTaskWithHistory(taskId: string): Promise<TaskWithHistory | null>` - Get task with full history
- `close(): Promise<void>` - Close database connection

### Factory Functions

#### createDrizzleAdapter
```typescript
function createDrizzleAdapter(config: DrizzleStorageConfig): Promise<StorageAdapter>
```

#### drizzleAdapter
```typescript
function drizzleAdapter(databasePath?: string): Promise<StorageAdapter>
```

#### tursoAdapter
```typescript
function tursoAdapter(url: string, authToken: string, debug?: boolean): Promise<StorageAdapter>
```

#### memoryDrizzleAdapter
```typescript
function memoryDrizzleAdapter(): Promise<StorageAdapter>
```