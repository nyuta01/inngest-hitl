/**
 * @inngest-hitl/a2a
 * A2A Protocol implementation for TypeScript
 */

// Core exports
export { createA2A } from './core'
export { defineExecutor } from './executor'
export { createA2AHttpClient } from './client'

// Constants
export { 
  A2A_EVENT_TYPES
} from './constants'

// Type exports (excluding types that conflict with schemas)
export type { 
  Executor,
  ExecutorContext,
  A2AConfig,
  A2AInstance,
  A2AEvent,
} from './types'
export type { A2AHttpClient, A2AClientConfig } from './client'

// Schema exports - explicitly export only public APIs
export type { 
  // Base types
  TaskState,
  Role,
  Metadata,
  
  // Parts
  Part,
  TextPart,
  DataPart,
  FilePart,
  File,
  
  // Main types
  Message,
  Artifact,
  Task,
  TaskStatus,
  
  // JSON-RPC types
  JSONRPCRequest,
  JSONRPCResponse
} from './schemas'

// Export schemas for validation
export {
  // Main schemas
  MessageSchema,
  ArtifactSchema,
  TaskSchema,
  TaskStatusSchema,
  
  // JSON-RPC schemas
  JSONRPCRequestSchema,
  JSONRPCErrorSchema,
  JSONRPCErrorResponseSchema,
  JSONRPCSuccessResponseSchema,
  JSONRPCErrorCode
} from './schemas'

// Storage exports
export type { StorageAdapter } from './storage/adapter'
export { 
  drizzleAdapter,
  type DrizzleAdapterConfig
} from './storage/adapters/drizzle'

// Integration exports
export { 
  nextjsIntegration,
  createSSEEventSender,
  type NextjsIntegrationOptions,
  type NextjsHandlers
} from './integrations/nextjs'