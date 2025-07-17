/**
 * Drizzle storage adapter for A2A
 * 
 * This module provides SQLite and PostgreSQL storage using Drizzle ORM
 */

import { 
  DrizzleStorageAdapter,
  drizzleAdapter as drizzleAdapterV3,
  createAdapter
} from './adapter'
import type { StorageAdapter } from '../../adapter'

// Re-export schemas and types
export * from './schema'


// Define config type for backward compatibility
export interface DrizzleAdapterConfig {
  provider: 'pg' | 'sqlite'
  schema?: {
    tasks: any;
    messages: any;
    artifacts: any;
    taskMessages: any;
  }
}

/**
 * Create a Drizzle adapter from an existing database instance
 * 
 * This function maintains backward compatibility while using the new v3 implementation
 * 
 * @param db - Existing Drizzle database instance
 * @param config - Adapter configuration
 * @returns StorageAdapter - Storage adapter
 * 
 * @example
 * ```typescript
 * import { db } from '@/db'
 * import * as schema from '@/db/schema'
 * 
 * // Simple usage (backward compatible)
 * const adapter = drizzleAdapter(db, { provider: 'sqlite' })
 * 
 * // Recommended usage with explicit schema
 * const adapter = drizzleAdapter(db, {
 *   provider: 'sqlite',
 *   schema: {
 *     tasks: schema.tasks,
 *     messages: schema.messages,
 *     artifacts: schema.artifacts,
 *     taskMessages: schema.taskMessages,
 *   }
 * })
 * ```
 */
export function drizzleAdapter(
  db: any, // Drizzle database instance
  config: DrizzleAdapterConfig
): StorageAdapter {
  // If schema is provided, use it directly with v3 adapter
  if (config.schema && 
      'tasks' in config.schema && 
      'messages' in config.schema && 
      'artifacts' in config.schema && 
      'taskMessages' in config.schema) {
    return drizzleAdapterV3(
      db,
      config.schema,
      config.provider
    )
  }
  
  // For backward compatibility, extract schema from db if not provided
  const schema = config.schema || db?._.fullSchema || db?._.schema
  if (!schema || !schema.tasks || !schema.messages || !schema.artifacts || !schema.taskMessages) {
    throw new Error(
      'Drizzle adapter requires schema with tasks, messages, artifacts, and taskMessages tables. ' +
      'Please provide schema in config or ensure your database instance includes the schema.'
    )
  }
  
  return drizzleAdapterV3(
    db,
    schema as {
      tasks: any;
      messages: any;
      artifacts: any;
      taskMessages: any;
    },
    config.provider
  )
}

