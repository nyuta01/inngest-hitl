# Inngest Human-in-the-Loop Research System

A Next.js application that implements an AI-powered research workflow with human approval steps using Inngest for orchestration and OpenAI for content generation.

![](./assets/output.gif)

## Features

- 🤖 **AI-Powered Research**: Uses OpenAI GPT-4 to generate research plans and execute research
- 👥 **Human-in-the-Loop**: Requires human approval at key decision points
- 🔄 **Real-time Updates**: Live progress tracking with Server-Sent Events
- 🎯 **Iterative Feedback**: Supports feedback loops for plan refinement
- 🎨 **Modern UI**: Clean, flat design with dark mode support
- ⏱️ **Timeout Handling**: Automatic timeout after 30 minutes of inactivity

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
│   Next.js   │────▶│   Inngest    │────▶│   OpenAI    │
│   Frontend  │◀────│  Workflow    │◀────│   GPT-4     │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│     SSE     │     │   Realtime   │
│   Updates   │     │   Events     │
└─────────────┘     └──────────────┘
```

## Project Structure

```
src/
├── app/              # Next.js app directory
├── components/       # React components
├── hooks/           # Custom React hooks
├── inngest/         # Inngest workflow functions
├── lib/             # Utility functions
└── types/           # TypeScript type definitions
```

## Key Technologies

- **Next.js 15**: React framework with App Router
- **Inngest**: Durable workflow orchestration
- **OpenAI**: GPT-4 for content generation
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Zod**: Runtime type validation

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