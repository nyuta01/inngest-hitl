/**
 * Message type definition from A2A specification
 */

import { z } from 'zod'
import { RoleSchema, MetadataSchema } from './base'
import { PartSchema } from './parts'

// Message schema (A2A spec compliant)
export const MessageSchema = z.object({
  // Required fields
  kind: z.literal('message'),
  messageId: z.string(),
  parts: z.array(PartSchema),
  role: RoleSchema,
  
  // Optional fields
  contextId: z.string().optional(),
  extensions: z.array(z.string()).optional(),
  metadata: MetadataSchema,
  referenceTaskIds: z.array(z.string()).optional(),
  taskId: z.string().optional()
})

export type Message = z.infer<typeof MessageSchema>