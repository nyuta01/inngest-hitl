/**
 * Constants for A2A
 */

// Event types
export const A2A_EVENT_TYPES = {
  STATUS_UPDATE: 'status-update',
  ARTIFACT_UPDATE: 'artifact-update',
} as const

export type A2AEventType = typeof A2A_EVENT_TYPES[keyof typeof A2A_EVENT_TYPES]

// Task states (matching A2A spec)
export const TASK_STATES = {
  SUBMITTED: 'submitted',
  WORKING: 'working',
  INPUT_REQUIRED: 'input-required',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  FAILED: 'failed',
  REJECTED: 'rejected',
  AUTH_REQUIRED: 'auth-required',
  UNKNOWN: 'unknown'
} as const

// JSON-RPC methods
export const JSONRPC_METHODS = {
  SEND_MESSAGE: 'message/send',
  SEND_STREAMING_MESSAGE: 'message/stream/send',
  GET_TASK: 'tasks/get',
  CANCEL_TASK: 'tasks/cancel',
  SET_TASK_PUSH_NOTIFICATION_CONFIG: 'tasks/pushNotificationConfig/set',
  GET_TASK_PUSH_NOTIFICATION_CONFIG: 'tasks/pushNotificationConfig/get'
} as const

// JSON-RPC error codes
export const JSONRPC_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  TASK_NOT_FOUND: -32001,
  INVALID_TASK_STATE: -32002,
  EXTENSION_NOT_SUPPORTED: -32003
} as const