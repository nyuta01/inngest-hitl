/**
 * Part type definitions from A2A specification
 */

import { z } from 'zod'
import { MetadataSchema } from './base'

// TextPart
export const TextPartSchema = z.object({
  kind: z.literal('text'),
  text: z.string(),
  metadata: MetadataSchema
})

export type TextPart = z.infer<typeof TextPartSchema>

// FileBase
export const FileBaseSchema = z.object({
  mimeType: z.string().optional(),
  name: z.string().optional()
})

// File (can have either bytes or uri)
export const FileSchema = z.union([
  FileBaseSchema.extend({ bytes: z.string() }), // base64 encoded
  FileBaseSchema.extend({ uri: z.string().url() })
])

export type File = z.infer<typeof FileSchema>

// FilePart
export const FilePartSchema = z.object({
  kind: z.literal('file'),
  file: FileSchema,
  metadata: MetadataSchema
})

export type FilePart = z.infer<typeof FilePartSchema>

// DataPart
export const DataPartSchema = z.object({
  kind: z.literal('data'),
  data: z.any(), // structured data
  metadata: MetadataSchema
})

export type DataPart = z.infer<typeof DataPartSchema>

// Part union (discriminated union by 'kind')
export const PartSchema = z.discriminatedUnion('kind', [
  TextPartSchema,
  FilePartSchema,
  DataPartSchema
])

export type Part = z.infer<typeof PartSchema>