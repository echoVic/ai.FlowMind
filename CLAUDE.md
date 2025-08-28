# CLAUDE.md

always respond in Chinese

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowMind is an AI-native flowchart generator that creates professional Mermaid diagrams from natural language descriptions. The system features a 3-panel interface with natural language input, Monaco code editor, and real-time Mermaid preview.

## Architecture

**Monorepo Structure:**
- Root: Turbo monorepo with `apps/web` as the main Next.js application
- **Deployment**: Pure frontend architecture, supports static deployments (Vercel, Netlify)
- **State Management**: Zustand for global state, localStorage for persistence
- **AI Integration**: LangChain.js with direct API calls, no backend server required

**Key Components Path:**
- `apps/web/` - Main Next.js 15 App Router application
- `apps/web/lib/agents/DiagramAgent.ts` - Core AI agent for diagram generation
- `apps/web/lib/services/AgentManager.ts` - Global agent management with conversation history isolation
- `apps/web/components/ai-native/` - AI-first UI components

## Development Commands

**Setup:**
```bash
pnpm install                # Install dependencies
```

**Development:**
```bash
pnpm dev                    # Start development server (http://localhost:3000)
pnpm lint                   # Run ESLint
pnpm build                  # Build production version
```

**Environment Variables:**
Create `.env.local` in root:
```bash
# Primary: Volcengine/豆包 (recommended)
NEXT_PUBLIC_ARK_API_KEY=your-key
NEXT_PUBLIC_ARK_MODEL_NAME=ep-20250617131345-rshkp
NEXT_PUBLIC_ARK_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3

# Optional: OpenAI
NEXT_PUBLIC_OPENAI_API_KEY=your-key
NEXT_PUBLIC_OPENAI_MODEL_NAME=gpt-4

# Optional: Anthropic
NEXT_PUBLIC_ANTHROPIC_API_KEY=your-key
NEXT_PUBLIC_ANTHROPIC_MODEL_NAME=claude-3-sonnet-20240229
```

## Core Architecture Patterns

**Conversation History Model:**
- Agent-based conversation isolation in `DiagramAgent.ts:1456`
- Each agent instance maintains its own conversation history using `conversationHistory: BaseMessage[]`
- History is automatically truncated after 20 messages to prevent overflow
- Agents are singleton-managed via `AgentManager.ts:235`

**AI Request Flow:**
```
AntdChatInterface → /api/chat/route.ts → AgentManager → DiagramAgent → AI Provider
```

**Multi-Provider Support:**
- Volcengine/Qwen via `VolcengineLangChainProvider`
- OpenAI via `ChatOpenAI`
- Claude via `ChatAnthropic`
- Factory pattern in `DiagramAgentFactory.ts:1667`

## Key Files

**Diagram Agent:** 
- `DiagramAgent.ts:410` - Main AI agent class with robust response parsing
- Supports streaming, conversation history, code validation, and multi-context modes

**API Endpoints:**
- `/api/chat/route.ts` - Main chat endpoint
- `/api/chat/history/` - Conversation history management

**UI Components:**
- `ConversationalWorkspace.tsx` - Main 3-panel interface
- `AntdChatInterface.tsx` - AI chat interface using Ant Design X
- `DiagramPreview/` - Real-time Mermaid rendering

**Configuration:**
- Model selection via Zustand store
- Session isolation based on sessionId
- Dynamic provider switching with fallback handling

## Testing & Debugging

**Common Issues:**
- "Agent not found" - Check `.env.local` configuration and restart dev server
- API failures - Verify model names and endpoints in agent initialization logs
- Memory issues - Check conversation history length via agentManager debug methods