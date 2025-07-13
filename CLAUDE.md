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
- **Inngest** for durable workflow orchestration with realtime updates
- **OpenAI GPT-4** via Vercel AI SDK for content generation
- **Tailwind CSS v4** for styling (flat design system)
- **Zod** for schema validation
- **Server-Sent Events (SSE)** for real-time UI updates

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
│   │   ├── inngest/         # Inngest webhook endpoints
│   │   │   └── route.ts     # Handles Inngest events
│   │   └── research/        # Research API endpoints
│   │       └── route.ts     # SSE endpoint for real-time updates
│   ├── actions.ts           # Server actions for feedback submission
│   ├── page.tsx            # Main UI page
│   └── globals.css         # Global styles
├── components/
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
├── hooks/
│   ├── useFeedbackSubmission.ts      # Feedback submission hook
│   └── useResearchStream.ts          # SSE stream handling hook
├── inngest/
│   ├── client.ts           # Inngest client with realtime middleware
│   ├── functions/
│   │   ├── index.ts        # Function exports
│   │   └── research.ts     # HITL workflow implementation
│   └── types.ts            # Event type definitions
├── lib/
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
OPENAI_API_KEY=your-openai-api-key
INNGEST_DEV=1
INNGEST_BASE_URL=http://localhost:8288
```

## Development Workflow

1. Start Inngest Dev Server: `docker compose up`
2. Start Next.js dev server: `pnpm run dev`
3. Access Inngest Dev UI at: http://localhost:8288
4. Access Next.js app at: http://localhost:3000

## Event Schema

The system uses strongly-typed events with Zod schemas:

- `research.submit`: Initiates research with a theme
- `research.plan.feedback`: Provides plan approval/feedback with UUID
- `research.execution.feedback`: Provides execution approval/feedback with UUID

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

## Testing Workflow

1. Submit a research theme via the form
2. Monitor the timeline for AI-generated plan
3. Review and approve/reject the plan
4. If approved, monitor execution progress
5. Review and approve/reject final results
6. Check completion status in summary stats