/**
 * Artifact type definition from A2A specification
 */

import { z } from 'zod'
import { MetadataSchema } from './base'
import { PartSchema } from './parts'

// Artifact schema (A2A spec compliant)
export const ArtifactSchema = z.object({
  artifactId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  parts: z.array(PartSchema),
  extensions: z.array(z.string()).optional(),
  metadata: MetadataSchema
})

export type Artifact = z.infer<typeof ArtifactSchema>