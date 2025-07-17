import type { AgentCard } from "@a2a-js/sdk";

export const researchAgentCard: AgentCard = {
  name: "Inngest HITL Research Agent",
  description: "An AI-powered research agent with Human-in-the-Loop capabilities for generating and executing research plans",
  version: "1.0.0",
  capabilities: {
    streaming: true,
    pushNotifications: true,
    extensions: [
      {
        uri: "https://inngest-hitl.com/schemas/research-plan-request/v1",
        description: "Accepts structured research theme requests to generate research plans",
        required: false,
        params: {
          schemaUrl: "https://inngest-hitl.com/schemas/research-plan-request.schema.json"
        }
      },
      {
        uri: "https://inngest-hitl.com/schemas/research-plan-response/v1",
        description: "Returns structured research plans with methods, outcomes, and reasoning",
        required: true,
        params: {
          schemaUrl: "https://inngest-hitl.com/schemas/research-plan-response.schema.json"
        }
      },
      {
        uri: "https://inngest-hitl.com/schemas/research-execution-response/v1",
        description: "Returns structured research execution results with findings and analysis",
        required: true,
        params: {
          schemaUrl: "https://inngest-hitl.com/schemas/research-execution-response.schema.json"
        }
      },
      {
        uri: "https://inngest-hitl.com/schemas/hitl-feedback/v1",
        description: "Accepts structured human feedback for approval/rejection with comments",
        required: true,
        params: {
          schemaUrl: "https://inngest-hitl.com/schemas/hitl-feedback.schema.json"
        }
      }
    ]
  },
  metadata: {
    author: "Inngest HITL Team",
    homepage: "https://inngest-hitl.com",
    tags: ["research", "ai", "hitl", "human-in-the-loop"],
    languages: ["ja", "en"],
    timeout: {
      default: 30 * 60 * 1000, // 30 minutes
      max: 60 * 60 * 1000 // 1 hour
    }
  }
};

// Export helper function to get extension by URI
export function getExtensionByUri(uri: string) {
  return researchAgentCard.capabilities.extensions?.find(ext => ext.uri === uri);
}

// Export all extension URIs as constants for type safety
export const EXTENSION_URIS = {
  RESEARCH_PLAN_REQUEST: "https://inngest-hitl.com/schemas/research-plan-request/v1",
  RESEARCH_PLAN_RESPONSE: "https://inngest-hitl.com/schemas/research-plan-response/v1",
  RESEARCH_EXECUTION_RESPONSE: "https://inngest-hitl.com/schemas/research-execution-response/v1",
  HITL_FEEDBACK: "https://inngest-hitl.com/schemas/hitl-feedback/v1"
} as const;

export type ExtensionUri = typeof EXTENSION_URIS[keyof typeof EXTENSION_URIS];