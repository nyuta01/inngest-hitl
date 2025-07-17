/**
 * JSON-RPC schemas for A2A specification
 */

import { z } from 'zod'
import { MessageSchema } from './message'
import { TaskSchema } from './task'

// JSON-RPC 2.0 base request
export const JSONRPCRequestBaseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]),
})

// Method-specific params schemas
export const SendMessageParamsSchema = z.object({
  message: MessageSchema,
  context: z.object({
    taskId: z.string().optional()
  }).optional()
})

export const GetTaskParamsSchema = z.object({
  taskId: z.string()
})

export const CancelTaskParamsSchema = z.object({
  taskId: z.string(),
  contextId: z.string(),
  reason: z.string().optional()
})

export const SetTaskPushNotificationConfigParamsSchema = z.object({
  taskId: z.string(),
  config: z.object({
    url: z.string().url(),
    headers: z.record(z.string()).optional()
  })
})

export const GetTaskPushNotificationConfigParamsSchema = z.object({
  taskId: z.string()
})

// JSON-RPC request with method discrimination
export const JSONRPCRequestSchema = z.discriminatedUnion('method', [
  JSONRPCRequestBaseSchema.extend({
    method: z.literal('message/send'),
    params: SendMessageParamsSchema
  }),
  JSONRPCRequestBaseSchema.extend({
    method: z.literal('tasks/get'),
    params: GetTaskParamsSchema
  }),
  JSONRPCRequestBaseSchema.extend({
    method: z.literal('tasks/cancel'),
    params: CancelTaskParamsSchema
  }),
  JSONRPCRequestBaseSchema.extend({
    method: z.literal('tasks/setPushNotificationConfig'),
    params: SetTaskPushNotificationConfigParamsSchema
  }),
  JSONRPCRequestBaseSchema.extend({
    method: z.literal('tasks/getPushNotificationConfig'),
    params: GetTaskPushNotificationConfigParamsSchema
  })
])

export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>

// JSON-RPC response schemas
export const JSONRPCErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional()
})

export const JSONRPCErrorResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]),
  error: JSONRPCErrorSchema
})

export const JSONRPCSuccessResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number(), z.null()]),
  result: z.unknown()
})

// Method-specific success responses
export const SendMessageSuccessResponseSchema = JSONRPCSuccessResponseSchema.extend({
  result: z.object({
    task: TaskSchema
  })
})

export const SendStreamingMessageSuccessResponseSchema = JSONRPCSuccessResponseSchema.extend({
  result: z.object({
    task: TaskSchema,
    streamUrl: z.string().url()
  })
})

export const GetTaskSuccessResponseSchema = JSONRPCSuccessResponseSchema.extend({
  result: z.object({
    task: TaskSchema
  })
})

export const CancelTaskSuccessResponseSchema = JSONRPCSuccessResponseSchema.extend({
  result: z.object({
    task: TaskSchema
  })
})

export const SetTaskPushNotificationConfigSuccessResponseSchema = JSONRPCSuccessResponseSchema.extend({
  result: z.object({
    success: z.boolean()
  })
})

export const GetTaskPushNotificationConfigSuccessResponseSchema = JSONRPCSuccessResponseSchema.extend({
  result: z.object({
    config: z.object({
      url: z.string().url(),
      headers: z.record(z.string()).optional()
    }).nullable()
  })
})

// Union type for all responses
export type JSONRPCResponse = 
  | z.infer<typeof JSONRPCErrorResponseSchema>
  | z.infer<typeof SendMessageSuccessResponseSchema>
  | z.infer<typeof SendStreamingMessageSuccessResponseSchema>
  | z.infer<typeof GetTaskSuccessResponseSchema>
  | z.infer<typeof CancelTaskSuccessResponseSchema>
  | z.infer<typeof SetTaskPushNotificationConfigSuccessResponseSchema>
  | z.infer<typeof GetTaskPushNotificationConfigSuccessResponseSchema>

// Standard JSON-RPC error codes
export const JSONRPCErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // A2A specific error codes
  TASK_NOT_FOUND: -32001,
  EXECUTOR_NOT_FOUND: -32002,
  STORAGE_ERROR: -32003
} as const