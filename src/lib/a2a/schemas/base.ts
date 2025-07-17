/**
 * Base type definitions from A2A specification
 */

import { z } from 'zod'

// TaskState from A2A spec (9 states)
export const TaskStateSchema = z.enum([
  'submitted',
  'working',
  'input-required',
  'completed',
  'canceled',
  'failed',
  'rejected',
  'auth-required',
  'unknown'
])

export type TaskState = z.infer<typeof TaskStateSchema>

// Role from A2A spec
export const RoleSchema = z.enum(['agent', 'user'])

export type Role = z.infer<typeof RoleSchema>

// Metadata (arbitrary object)
export const MetadataSchema = z.record(z.unknown()).optional()

export type Metadata = z.infer<typeof MetadataSchema>