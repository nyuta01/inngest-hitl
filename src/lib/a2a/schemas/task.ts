/**
 * Task type definition from A2A specification
 */

import { z } from 'zod'
import { TaskStateSchema, MetadataSchema } from './base'
import { MessageSchema } from './message'
import { ArtifactSchema } from './artifact'

// TaskStatus
export const TaskStatusSchema = z.object({
  state: TaskStateSchema,
  message: MessageSchema.optional(),
  timestamp: z.string().optional() // ISO 8601
})

export type TaskStatus = z.infer<typeof TaskStatusSchema>

// Task (A2A spec compliant)
export const TaskSchema = z.object({
  // Required fields
  contextId: z.string(),
  id: z.string(), // Note: A2A spec uses "id", not "taskId"
  kind: z.literal('task'),
  status: TaskStatusSchema,
  
  // Optional fields
  artifacts: z.array(ArtifactSchema).optional(),
  history: z.array(MessageSchema).optional(),
  metadata: MetadataSchema
})

export type Task = z.infer<typeof TaskSchema>