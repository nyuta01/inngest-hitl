/**
 * Research Start Executor for A2A-Inngest Integration
 * Initiates the research workflow and transitions to input-required state
 */

import { defineExecutor } from '@/lib/a2a'
import { inngest } from '@/inngest/client'
import { z } from 'zod'

// Input schema
const ResearchInputSchema = z.object({
  theme: z.string().min(1, 'Theme is required'),
  depth: z.enum(['basic', 'detailed', 'comprehensive']).optional().default('basic'),
  language: z.enum(['ja', 'en']).optional().default('ja')
})

// Output schema
const StartOutputSchema = z.object({
  inngestRunId: z.string()
})

export const researchStartExecutorV2 = defineExecutor({
  extension: 'https://inngest-hitl.com/research/v2/start',
  input: ResearchInputSchema,
  output: StartOutputSchema,
  
  execute: async (input, context) => {
    console.info("[Research Start Executor] execute", {
      input,
      context,
    })
    // Start Inngest workflow
    const { ids } = await inngest.send({
      name: 'research.a2a.v2.start',
      data: {
        taskId: context.taskId,
        contextId: context.contextId,
        theme: input.theme,
        depth: input.depth,
        language: input.language,
        a2aConfig: {
          baseUrl: process.env.A2A_BASE_URL || 'http://localhost:3000/api/a2a',
          token: process.env.A2A_API_TOKEN
        }
      }
    })
    
    const inngestRunId = ids[0]
  
    
    return {
      inngestRunId,
    }
  }
})