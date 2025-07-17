# Inngest Human-in-the-Loop Research System

A Next.js application that implements an AI-powered research workflow with human approval steps using Inngest for orchestration, A2A Protocol for agent communication, and OpenAI for content generation.

![](./assets/output.gif)

## Features

- 🤖 **AI-Powered Research**: Uses OpenAI GPT-4 to generate research plans and execute research
- 👥 **Human-in-the-Loop**: Requires human approval at key decision points
- 🔄 **Real-time Updates**: Live progress tracking with Server-Sent Events (Memory/Redis support)
- 🎯 **Iterative Feedback**: Supports feedback loops for plan refinement
- 🌐 **A2A Protocol**: Standards-compliant agent-to-agent communication based on @a2a-js/sdk
- 🗄️ **Persistent Storage**: PostgreSQL/SQLite support with Drizzle ORM
- 🔧 **Inngest Integration**: Durable workflow orchestration with A2A Protocol
- 🎨 **Modern UI**: Clean, flat design with dark mode support
- ⏱️ **Timeout Handling**: Automatic timeout after 30 minutes of inactivity
- 📦 **Modular A2A Library**: Complete A2A implementation as a reusable library in `lib/a2a`

## Prerequisites

- Node.js 18+ 
- Docker (for Inngest Dev Server)
- OpenAI API key

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/nyuta01/inngest-hitl.git
   cd inngest-hitl
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your-openai-api-key
   INNGEST_DEV=1
   INNGEST_BASE_URL=http://localhost:8288
   ```

4. **Start Inngest Dev Server**
   ```bash
   docker compose up
   ```

5. **Start the development server**
   ```bash
   pnpm run dev
   ```

6. **Open the application**
   - App: http://localhost:3000
   - Inngest Dashboard: http://localhost:8288

## How It Works

### Research Workflow

1. **Submit Research Theme**: Enter a topic you want to research
2. **AI Generates Plan**: GPT-4 creates a research plan with methods and expected outcomes
3. **Human Review**: Approve or reject the plan (with optional feedback)
4. **AI Executes Research**: If approved, GPT-4 conducts the research
5. **Final Review**: Approve or reject the research results
6. **Completion**: View the final research summary

### Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Next.js   │────▶│     A2A      │────▶│   Inngest   │────▶│   OpenAI    │
│   Frontend  │◀────│   Protocol   │◀────│  Workflow   │◀────│   GPT-4     │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
       │                    │                     │
       │                    │                     │
       ▼                    ▼                     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│     SSE     │     │   Database   │     │  HTTP Client    │
│   Events    │     │  (Drizzle)   │     │  Integration    │
└─────────────┘     └──────────────┘     └─────────────────┘
```

#### A2A + Inngest Integration

This application showcases a complete integration between the A2A Protocol and Inngest workflows:

1. **A2A Executors**: Handle initial requests and human feedback using `defineExecutor`
2. **Inngest Workflows**: Orchestrate long-running research processes
3. **HTTP Client**: Bridge between Inngest and A2A for status updates via `createA2AHttpClient`
4. **SSE Events**: Real-time communication with consistent task IDs (Memory/Redis support)
5. **Persistent Storage**: Complete task and message history with Drizzle adapter

## Project Structure

```
src/
├── app/              # Next.js app directory
│   └── api/a2a/     # A2A API route handlers
├── components/       # React components
├── db/              # Database schema and configuration
├── executors/       # A2A executor implementations
│   ├── a2a.ts       # Shared A2A instance with SSE support
│   └── research-a2a/ # Research workflow executors
├── hooks/           # Custom React hooks
├── inngest/         # Inngest workflow functions
├── lib/             # Utility functions
│   └── a2a/         # Complete A2A Protocol implementation
│       ├── core.ts          # Core A2A functionality
│       ├── client.ts        # HTTP client for remote A2A
│       ├── executor.ts      # Executor definition helper
│       ├── schemas/         # Zod schemas for A2A types
│       ├── storage/         # Storage adapters (Memory/Drizzle)
│       └── integrations/    # Framework integrations (Next.js/Redis)
└── types/           # TypeScript type definitions
```

## Key Technologies

- **Next.js 15**: React framework with App Router
- **A2A Protocol**: Agent-to-agent communication standard (@a2a-js/sdk v0.2.5)
- **Inngest**: Durable workflow orchestration
- **OpenAI**: GPT-4 for content generation
- **Drizzle ORM**: TypeScript ORM for PostgreSQL/SQLite
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Zod**: Runtime type validation
- **Redis (optional)**: Pub/Sub for SSE event distribution

## A2A + Inngest Integration

This project demonstrates a complete integration between the A2A Protocol and Inngest workflows for Human-in-the-Loop AI systems.

### Demo Pages

1. **Basic A2A**: http://localhost:3000/a2a
   - Pure A2A Protocol implementation
   - JSON-RPC messaging
   - Real-time SSE updates

2. **Research Workflow V1**: http://localhost:3000/research-a2a
   - Simple A2A + Inngest integration
   - Basic research workflow

3. **Research Workflow V2**: http://localhost:3000/research-a2a-v2
   - Advanced A2A + Inngest integration
   - Multi-phase approval workflow
   - Complete task persistence

### Integration Architecture

```typescript
// 1. A2A Executor starts Inngest workflow
const researchStartExecutor = defineExecutor({
  extension: 'https://inngest-hitl.com/research/v2/start',
  input: z.object({
    theme: z.string(),
    depth: z.enum(['basic', 'detailed']).optional()
  }),
  output: z.object({
    status: z.enum(['processing', 'input-required']),
    requestId: z.string().optional()
  }),
  execute: async (input, context) => {
    // Start Inngest workflow with task context
    await inngest.send({
      name: 'research.a2a.v2.start',
      data: {
        taskId: context.taskId,  // Key: Pass task ID
        contextId: context.contextId,
        theme: input.theme,
        depth: input.depth || 'basic'
      }
    })
    
    // Update status
    await context.updateStatus(context.taskId!, context.contextId!, {
      state: 'input-required',
      timestamp: new Date().toISOString()
    })
    
    return { status: 'input-required' as const }
  }
})

// 2. Inngest workflow uses HTTP client for A2A communication
const researchWorkflow = inngest.createFunction(
  { id: 'research-with-a2a-v2' },
  { event: 'research.a2a.v2.start' },
  async ({ event, step }) => {
    const { taskId, contextId, theme } = event.data
    
    // Create A2A HTTP client
    const httpClient = createA2AHttpClient({
      baseUrl: process.env.A2A_BASE_URL || 'http://localhost:3000/api/a2a'
    })
    
    // Use A2A context for status updates
    await httpClient.updateStatus(taskId, contextId, {
      state: 'working',
      timestamp: new Date().toISOString()
    })
    
    // Generate research plan
    const plan = await step.run('generate-plan', async () => {
      return await generatePlan(theme)
    })
    
    // Save plan as artifact
    await httpClient.updateArtifact(taskId, contextId, {
      artifactId: crypto.randomUUID(),
      name: 'Research Plan',
      description: `Research plan for: ${theme}`,
      parts: [{
        kind: 'data' as const,
        data: plan
      }]
    })
    
    // Wait for human approval
    const approval = await step.waitForEvent('wait-for-approval', {
      event: 'research.a2a.v2.plan-feedback',
      timeout: '30m',
      if: `async.data.taskId == "${taskId}"`
    })
    
    // Continue workflow...
  }
)

// 3. Feedback executor sends events to Inngest
const planApprovalExecutor = defineExecutor({
  extension: 'https://inngest-hitl.com/research/v2/plan-approval',
  input: z.object({
    requestId: z.string(),
    decision: z.enum(['approve', 'reject']),
    feedback: z.string().optional()
  }),
  execute: async (input, context) => {
    // Send feedback to Inngest
    await inngest.send({
      name: 'research.a2a.v2.plan-feedback',
      data: {
        taskId: context.taskId,  // Same task ID
        decision: input.decision,
        feedback: input.feedback
      }
    })
    
    // Update task status
    if (input.decision === 'approve') {
      await context.updateStatus(context.taskId!, context.contextId!, {
        state: 'working',
        timestamp: new Date().toISOString()
      })
    } else {
      await context.updateStatus(context.taskId!, context.contextId!, {
        state: 'completed',
        timestamp: new Date().toISOString()
      })
    }
  }
})
```

### Key Benefits

- **Standards Compliance**: Uses A2A Protocol for interoperability
- **Durability**: Inngest ensures workflow completion
- **Real-time Updates**: SSE events with consistent task IDs
- **Type Safety**: Full TypeScript integration
- **Persistence**: Complete audit trail in database
- **Scalability**: Redis Pub/Sub for enterprise deployments

## A2A Library Implementation

The `lib/a2a` directory contains a complete, reusable implementation of the A2A Protocol:

### Core Components

- **createA2A()**: Creates an A2A instance with storage and event support
- **defineExecutor()**: Type-safe executor definition with Zod schemas
- **createA2AHttpClient()**: HTTP client for remote A2A communication
- **Storage Adapters**: Drizzle adapter for SQLite/PostgreSQL persistence
- **Next.js Integration**: Complete route handlers with SSE support

### Usage Example

```typescript
import { createA2A, defineExecutor, drizzleAdapter } from '@/lib/a2a'
import { z } from 'zod'

// 1. Define an executor with type-safe input/output
const myExecutor = defineExecutor({
  extension: 'https://example.com/my-executor/v1',
  input: z.object({
    prompt: z.string()
  }),
  output: z.object({
    result: z.string(),
    confidence: z.number()
  }),
  execute: async (input, context) => {
    // Update status
    await context.updateStatus(context.taskId!, context.contextId!, {
      state: 'working',
      timestamp: new Date().toISOString()
    })
    
    // Process and return typed result
    return {
      result: `Processed: ${input.prompt}`,
      confidence: 0.95
    }
  }
})

// 2. Create A2A instance with storage
const a2a = createA2A({
  storage: drizzleAdapter(db, { provider: 'sqlite' })
})

// 3. Register executors
a2a.register(myExecutor)
```

### Storage Configuration

The library supports multiple storage backends:

```typescript
// Drizzle adapter (recommended for all environments)
import { drizzleAdapter } from '@/lib/a2a'
const a2a = createA2A({
  storage: drizzleAdapter(db, {
    provider: 'sqlite', // or 'postgresql'
    schema: {
      tasks: schema.tasks,
      messages: schema.messages,
      artifacts: schema.artifacts
    }
  })
})

// Note: Memory adapter is available for internal use only
// For development/testing, use SQLite with Drizzle adapter
```

### SSE Support

Real-time updates are built-in with optional Redis support:

```typescript
// Basic SSE (in-memory)
export const { POST, GET } = nextjsIntegration(a2a)

// Redis SSE (for scale)
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

export const { POST, GET } = nextjsIntegration(a2a, {
  sse: {
    mode: 'redis',
    redis: redis
  }
})
```

## Development

### Available Scripts

```bash
pnpm run dev      # Start development server
pnpm run build    # Build for production
pnpm run start    # Start production server
pnpm run lint     # Run ESLint
```

### Testing the Workflow

1. Submit a research theme (e.g., "Climate Change Solutions")
2. Wait for the AI to generate a research plan
3. Review the plan and approve/reject with feedback
4. If approved, wait for research execution
5. Review the final results

### Customization

- **Timeout Duration**: Modify timeout in `src/inngest/functions/research.ts`
- **AI Model**: Change model settings in workflow functions
- **UI Theme**: Customize colors in `tailwind.config.js`

## Deployment

1. Build the application:
   ```bash
   pnpm run build
   ```

2. Set production environment variables

3. Deploy to your preferred hosting platform (Vercel, AWS, etc.)

4. Configure Inngest for production use

## Troubleshooting

### Common Issues

1. **SSE Connection Failed**: Ensure Inngest Dev Server is running on port 8288
2. **No Updates Showing**: Check browser console for SSE errors
3. **Timeout Errors**: Workflow times out after 30 minutes of inactivity
4. **OpenAI Errors**: Verify your API key is valid and has credits

### Debug Mode

View detailed logs in:
- Browser DevTools Console
- Inngest Dashboard (http://localhost:8288)
- Next.js terminal output

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Built with [Inngest](https://www.inngest.com/)
- Powered by [OpenAI](https://openai.com/)
- UI components inspired by modern design systems