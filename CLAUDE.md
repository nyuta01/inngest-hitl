# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application with Inngest integration that implements a Human-in-the-Loop (HITL) research workflow system. The project uses AI (OpenAI GPT-4) to generate research plans and execute research based on themes, with human approval steps at each stage.

## Development Commands

```bash
# Start development server with Turbopack
pnpm run dev

# Build for production
pnpm run build

# Start production server
pnpm run start

# Run linting
pnpm run lint

# Start Inngest Dev Server (required for local development)
docker compose up
```

## Architecture

### Core Technologies
- **Next.js 15.3.5** with App Router and Turbopack
- **React 19** with TypeScript
- **A2A Protocol** (@a2a-js/sdk v0.2.5) for agent-to-agent communication
- **Inngest** for durable workflow orchestration with realtime updates
- **OpenAI GPT-4** via Vercel AI SDK for content generation
- **Drizzle ORM** with SQLite/PostgreSQL for data persistence
- **Tailwind CSS v4** for styling (flat design system)
- **Zod** for schema validation
- **Server-Sent Events (SSE)** for real-time UI updates (Memory/Redis support)

### Workflow Architecture

The application implements a two-phase research workflow:

1. **Research Plan Generation** (`research.submit` event)
   - AI generates a research plan based on a theme
   - Waits for human approval via `research.plan.feedback` event
   - Supports iterative feedback loops
   - Timeout: 30 minutes

2. **Research Execution**
   - AI executes research based on approved plan
   - Waits for human approval via `research.execution.feedback` event
   - Supports iterative feedback loops
   - Timeout: 30 minutes

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── a2a/             # A2A Protocol endpoints (dynamic routing)
│   │   │   └── [[...all]]/
│   │   │       └── route.ts # Handles all A2A operations + SSE
│   │   ├── inngest/         # Inngest webhook endpoints
│   │   │   └── route.ts     # Handles Inngest events
│   │   └── research/        # Legacy research API endpoints
│   │       └── route.ts     # SSE endpoint for V1 workflow
│   ├── a2a/                 # Pure A2A demo page
│   │   └── page.tsx         # JSON-RPC interface demo
│   ├── research-a2a/        # V1 A2A + Inngest integration
│   │   └── page.tsx         # Basic research workflow
│   ├── research-a2a-v2/     # V2 A2A + Inngest integration
│   │   └── page.tsx         # Advanced multi-phase workflow
│   ├── actions.ts           # Server actions for feedback submission
│   ├── page.tsx            # Main UI page (legacy workflow)
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                  # Shadcn/ui components
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   └── textarea.tsx
│   ├── alert.tsx           # Alert component
│   ├── empty-state.tsx     # Empty state display
│   ├── feedback-form.tsx   # Approve/reject form
│   ├── research-complete-display.tsx  # Final results display
│   ├── research-display.tsx          # Main research timeline
│   ├── research-execution-display.tsx # Execution details
│   ├── research-form.tsx             # Research submission form
│   ├── research-plan-display.tsx     # Plan details
│   ├── spinner.tsx                   # Loading spinner
│   ├── summary-stats.tsx             # Status summary
│   └── timeline-item.tsx             # Timeline entry component
├── db/
│   ├── index.ts            # Database client configuration
│   └── schema.ts           # Drizzle schema definitions
│       ├── tasks            # A2A tasks table
│       ├── messages         # A2A messages table
│       ├── artifacts        # A2A artifacts table
│       └── taskMessages     # Task-message relationships
├── executors/
│   ├── a2a.ts              # Shared A2A instance with storage
│   └── research-a2a/       # Research workflow executors
│       ├── index.ts        # Executor exports
│       ├── start.ts        # Research start executor
│       ├── plan-approval.ts # Plan feedback executor
│       └── execution-approval.ts # Execution feedback executor
├── hooks/
│   ├── useA2AStream.ts     # A2A SSE stream handling
│   ├── useFeedbackSubmission.ts      # Feedback submission hook
│   └── useResearchStream.ts          # SSE stream handling hook
├── inngest/
│   ├── client.ts           # Inngest client with realtime middleware
│   ├── functions/
│   │   ├── index.ts        # Function exports
│   │   ├── research.ts     # Legacy HITL workflow
│   │   └── research-with-a2a.ts # A2A integrated workflows (V1 & V2)
│   └── types.ts            # Event type definitions
├── lib/
│   ├── a2a/                # Complete A2A Protocol implementation
│   │   ├── index.ts        # Public API exports
│   │   ├── core.ts         # Core A2A functionality
│   │   ├── client.ts       # HTTP client for remote A2A
│   │   ├── executor.ts     # Executor definition helper
│   │   ├── constants.ts    # A2A constants and event types
│   │   ├── types.ts        # TypeScript type definitions
│   │   ├── schemas/        # Zod schemas for A2A types
│   │   │   ├── base.ts     # Basic types (Role, TaskState)
│   │   │   ├── parts.ts    # Part types (TextPart, DataPart, FilePart)
│   │   │   ├── message.ts  # Message schema
│   │   │   ├── artifact.ts # Artifact schema
│   │   │   ├── task.ts     # Task schema
│   │   │   └── json-rpc.ts # JSON-RPC schemas
│   │   ├── storage/        # Storage layer
│   │   │   ├── adapter.ts  # StorageAdapter interface
│   │   │   └── adapters/   # Adapter implementations
│   │   │       ├── memory.ts    # In-memory adapter
│   │   │       └── drizzle/     # Drizzle ORM adapter
│   │   │           ├── adapter.ts # Main adapter
│   │   │           └── schema.ts  # Table schemas
│   │   └── integrations/   # Framework integrations
│   │       ├── nextjs/     # Next.js integration
│   │       │   ├── index.ts        # Public exports
│   │       │   ├── handler.ts      # Route handlers
│   │       │   ├── sse.ts          # SSE implementation
│   │       │   └── dynamic-handler.ts # Dynamic routing
│   │       └── redis/      # Redis Pub/Sub integration
│   │           ├── setup.ts        # Redis configuration
│   │           ├── sse-handler.ts  # Redis SSE handler
│   │           └── event-sender.ts # Event publishing
│   ├── agent-card.ts       # Agent card utilities
│   └── utils.ts            # Utility functions
└── types/
    └── research.ts         # TypeScript interfaces

```

### Key Implementation Details

1. **Real-time Updates**: Uses Inngest's realtime capability to stream workflow updates via SSE
2. **State Management**: React hooks manage local state with proper update patterns
3. **Message Deduplication**: Uses timestamps and UUIDs to prevent duplicate messages
4. **Completion Detection**: Monitors for "Research completed" message to update UI state
5. **Flat Design**: Modern, minimalist UI with solid colors and minimal depth effects

### Environment Variables

Required in `.env.local`:
```bash
# Core services
OPENAI_API_KEY=your-openai-api-key
INNGEST_DEV=1
INNGEST_BASE_URL=http://localhost:8288

# Optional: Redis for SSE at scale
REDIS_URL=redis://localhost:6379
REDIS_ENABLE_SSE=true

# Optional: A2A configuration
A2A_BASE_URL=http://localhost:3000/api/a2a
```

## Development Workflow

1. Start Inngest Dev Server: `docker compose up`
2. Start Next.js dev server: `pnpm run dev`
3. Access Inngest Dev UI at: http://localhost:8288
4. Access Next.js app at: http://localhost:3000

## A2A Protocol Implementation

The `lib/a2a` directory contains a complete, standalone implementation of the A2A Protocol that can be used as a library:

### Core Concepts

1. **Executors**: Define message handlers with type-safe input/output schemas
2. **Storage Adapters**: Pluggable persistence layer (Memory/Drizzle)
3. **SSE Support**: Built-in real-time updates with optional Redis
4. **HTTP Client**: Remote A2A communication for distributed systems

### Key Components

- **createA2A()**: Factory function to create A2A instances
- **defineExecutor()**: Helper to define type-safe executors with Zod schemas
- **nextjsIntegration()**: Next.js route handler generation with SSE
- **createA2AHttpClient()**: HTTP client for remote A2A endpoints
- **drizzleAdapter()**: Database persistence with SQLite/PostgreSQL

### Example Usage

```typescript
// 1. Define executor with Zod schemas
const myExecutor = defineExecutor({
  extension: 'https://example.com/my-executor/v1',
  input: z.object({ theme: z.string() }),
  output: z.object({ result: z.string() }),
  execute: async (input, context) => {
    await context.updateStatus(context.taskId!, context.contextId!, {
      state: 'working',
      timestamp: new Date().toISOString()
    })
    return { result: `Processed: ${input.theme}` }
  }
})

// 2. Create A2A instance with storage
const a2a = createA2A({
  storage: drizzleAdapter(db, { provider: 'sqlite' })
})

// 3. Register executors and create API handlers
a2a.register(myExecutor)
export const { POST, GET } = nextjsIntegration(a2a)
```

### A2A + Inngest Integration Pattern

The project demonstrates a powerful pattern for integrating A2A with Inngest:

1. **A2A Executors** handle initial requests and transitions to `input-required` state
2. **Inngest Workflows** orchestrate long-running processes
3. **HTTP Client** bridges Inngest back to A2A for status updates
4. **Consistent Task IDs** maintain context across the entire flow

## Event Schema

The system uses strongly-typed events with Zod schemas:

### Legacy Events (V1)
- `research.submit`: Initiates research with a theme
- `research.plan.feedback`: Provides plan approval/feedback with UUID
- `research.execution.feedback`: Provides execution approval/feedback with UUID

### A2A Events (V2)
- `research.a2a.v2.start`: Initiates A2A research workflow
- `research.a2a.v2.plan-feedback`: Plan approval via A2A executor
- `research.a2a.v2.execution-feedback`: Execution approval via A2A executor

## UI/UX Features

- **Real-time Timeline**: Shows all workflow events in reverse chronological order
- **Action Tracking**: Visual indicators for pending/completed actions
- **Inline Feedback**: Approve/reject forms within the timeline
- **Responsive Layout**: 2-column layout that maximizes timeline visibility
- **Dark Mode Support**: Full dark mode compatibility
- **Flat Design**: Clean, modern interface without shadows or gradients

## Common Issues & Solutions

1. **SSE Connection**: Ensure Inngest Dev Server is running on port 8288
2. **Completion Detection**: The system looks for "Research completed" message
3. **State Persistence**: Action completion states are preserved across updates
4. **Layout Constraints**: Uses flexbox to ensure all content fits on screen

## Available Demo Pages

### 1. Legacy Research Workflow
**URL**: http://localhost:3000
- Original implementation without A2A Protocol
- Direct Inngest integration
- Server actions for feedback

### 2. Pure A2A Demo
**URL**: http://localhost:3000/a2a
- Demonstrates raw A2A Protocol usage
- JSON-RPC messaging interface
- Real-time SSE updates
- Task history persistence

### 3. Research Workflow V1 (A2A + Inngest)
**URL**: http://localhost:3000/research-a2a
- Simple A2A executor integration
- Basic research workflow
- Single-phase approval

### 4. Research Workflow V2 (Advanced A2A + Inngest)
**URL**: http://localhost:3000/research-a2a-v2
- Full A2A Protocol implementation
- Multi-phase approval workflow
- Complete task/message/artifact persistence
- Production-ready pattern

## Testing Workflow

1. Submit a research theme via the form
2. Monitor the timeline for AI-generated plan
3. Review and approve/reject the plan
4. If approved, monitor execution progress
5. Review and approve/reject final results
6. Check completion status in summary stats

## Code Quality Requirements

### TypeScript Type Safety

**CRITICAL: The `any` type is STRICTLY PROHIBITED in this codebase.**

- NEVER use `any` type in TypeScript code
- Always provide explicit types for all variables, parameters, and return values
- Use proper type inference where applicable
- If unsure about a type, use `unknown` and narrow it down with type guards
- For complex types, create proper interfaces or type aliases

### Pre-completion Checklist

**MANDATORY: Before marking any task as complete, you MUST:**

1. **Check IDE Diagnostics**: Run `mcp__ide__getDiagnostics` to verify there are NO TypeScript errors or warnings
Always specify a file when using getDiagnostics.
2. **Verify Type Safety**: Ensure all code has proper TypeScript types (no `any` types)
3. **Run Linting**: Execute `pnpm run lint` to check for code style issues
4. **Test Functionality**: Verify the implementation works as expected
5. **Review Changes**: Double-check all modified files for correctness

**IMPORTANT**: Do NOT consider a task complete if there are ANY IDE errors, type issues, or linting problems. Fix all issues before proceeding.