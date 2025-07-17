/**
 * Type definitions for Drizzle adapter using Zod
 * 
 * These types represent the shape of data being stored in the database.
 * The actual table schemas are defined in your existing database setup.
 */

import { z } from 'zod'

export const NewTaskSchema = z.object({
  id: z.string(),
  kind: z.string(),
  status: z.string(),
  statusState: z.string(),
  statusMessage: z.string().nullable(),
  statusReason: z.string().nullable(),
  contextId: z.string().nullable(),
  extensions: z.string().nullable(),
  metadata: z.string(),
  createdAt: z.date().optional(),
  updatedAt: z.date()
})

export const NewMessageSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  kind: z.string(),
  messageId: z.string(),
  role: z.string(),
  parts: z.string(),
  contextId: z.string().nullable(),
  extensions: z.string().nullable(),
  metadata: z.string(),
  updatedAt: z.date()
}).passthrough() // Allow additional properties for different schema structures

export const NewArtifactSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  artifactId: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  parts: z.string(),
  extensions: z.string().nullable(),
  metadata: z.string(),
  updatedAt: z.date()
}).passthrough() // Allow additional properties for different schema structures

export type NewTask = z.infer<typeof NewTaskSchema>
export type NewMessage = z.infer<typeof NewMessageSchema>
export type NewArtifact = z.infer<typeof NewArtifactSchema>

// Database row schemas for parsing
export const DbTaskRowSchema = z.object({
  id: z.string(),
  kind: z.string(),
  status: z.string(),
  statusState: z.string(),
  statusMessage: z.string().nullable(),
  statusReason: z.string().nullable(),
  contextId: z.string().nullable(),
  extensions: z.string().nullable(),
  metadata: z.string(),
  createdAt: z.union([z.date(), z.number()]).optional(),
  updatedAt: z.union([z.date(), z.number()]).optional()
}).passthrough()

export const DbMessageRowSchema = z.object({
  id: z.string(),
  taskId: z.string().optional(),
  kind: z.string(),
  messageId: z.string(),
  role: z.string(),
  parts: z.string(),
  contextId: z.string().nullable(),
  extensions: z.string().nullable(),
  metadata: z.string(),
  createdAt: z.union([z.date(), z.number()]).optional(),
  updatedAt: z.union([z.date(), z.number()]).optional()
}).passthrough()

export const DbArtifactRowSchema = z.object({
  id: z.string(),
  taskId: z.string().optional(),
  artifactId: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  parts: z.string(),
  extensions: z.string().nullable(),
  metadata: z.string(),
  createdAt: z.union([z.date(), z.number()]).optional(),
  updatedAt: z.union([z.date(), z.number()]).optional()
}).passthrough()

export type DbTaskRow = z.infer<typeof DbTaskRowSchema>
export type DbMessageRow = z.infer<typeof DbMessageRowSchema>
export type DbArtifactRow = z.infer<typeof DbArtifactRowSchema>