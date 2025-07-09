# CLAUDE.md

always respond in Chinese

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based AI-powered diagram generation application that allows users to create Mermaid diagrams through natural language descriptions. The application features a three-panel layout with input, code editing, and live preview capabilities.

**重要架构变更**: ✅ 项目已完全重构为基于 LangChain.js 的纯前端架构，移除了所有服务端代码，实现了真正的无服务器架构。

## Key Commands

### Development (使用 pnpm)
- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production  
- `pnpm preview` - Preview production build
- `pnpm install` - Install dependencies

### Build System
- Uses Rsbuild as the build tool (configured in `rsbuild.config.ts`)
- Entry point: `src/entry.tsx`
- Supports TypeScript, React, and Tailwind CSS
- Package manager: pnpm (see `.npmrc` for configuration)
- 纯前端构建，无服务端依赖

## Architecture

### 新架构实现状态 ✅

完成的任务：
- ✅ 设计基于 LangChain 的 Agent 架构
- ✅ 实现 DiagramAgent 基于 LangChain
- ✅ 创建 AI Provider 适配器
- ✅ 重构前端调用逻辑
- ✅ 移除冗余的服务端代码
- ✅ 更新构建配置
- ✅ 更新文档

### 简化后的架构图
```
┌─────────────────┐    调用    ┌─────────────────┐    调用    ┌─────────────────┐
│   React 前端    │ ─────────► │  LangChain      │ ─────────► │   AI 提供商     │
│                 │            │  DiagramAgent   │            │ (火山引擎/OpenAI)│
│  - 输入面板     │            │                 │            │                 │
│  - 代码编辑器   │            │  - 提示工程     │            │  - 统一调用     │
│  - 实时预览     │            │  - 结果解析     │            │  - 错误处理     │
│                 │            │  - 记忆管理     │            │  - 重试机制     │
└─────────────────┘            └─────────────────┘            └─────────────────┘
```

### Frontend Structure
- **Main Layout**: Three-panel interface (Input → Code Editor → Live Preview)
- **State Management**: Jotai atoms for global state (see `src/stores/diagramStore.ts`)
- **UI Framework**: NextUI components with Tailwind CSS styling
- **Code Editor**: Monaco Editor for Mermaid code editing
- **Diagram Rendering**: Mermaid.js for diagram visualization
- **AI Integration**: 通过 Agent Manager 统一管理所有 AI 提供商

### AI Agent Architecture (基于 LangChain.js)
- **Base Agent**: `src/agents/BaseAgent.ts` - 通用 Agent 基类，已废弃，被 LangChain Agent 替代
- **Diagram Agent**: `src/agents/DiagramAgent.ts` - 专用于图表生成的 Agent，基于 LangChain
- **Agent Manager**: `src/services/AgentManager.ts` - 统一管理多个 Agent 实例
- **Provider 适配器**: 
  - `VolcengineLangChainProvider` - 自定义火山引擎适配器，兼容 LangChain 接口
  - `ChatOpenAI` - 原生 OpenAI 支持 (via @langchain/openai)
  - `ChatAnthropic` - 原生 Claude 支持 (via @langchain/anthropic)

### Key Components
- `DiagramGenerator/index.tsx` - Main layout component with three panels
- `InputPanel.tsx` - Natural language input for diagram generation
- `CodeEditor/index.tsx` - Monaco-based Mermaid code editor
- `DiagramPreview/index.tsx` - Live Mermaid diagram preview
- `AIAssistant/index.tsx` - AI interaction panel
- `useDiagramGenerator.ts` - 核心 Hook，已重构为使用 Agent 系统

### State Management
Primary atoms in `src/stores/diagramStore.ts`:
- `currentDiagramAtom` - Current diagram data
- `selectedModelAtom` - Currently selected AI model (defaults to 'doubao-seed-1.6')
- `isGeneratingAtom` - Loading state for AI generation
- `naturalLanguageInputAtom` - User input text
- `aiResponseAtom` - AI 响应数据，已更新支持 Agent metadata

### 已移除的部分 ✅
- ~~`src/server/` 目录~~ - 已完全移除整个服务端代码
- ~~`src/services/aiDirectClient.ts`~~ - 已删除，被 Agent 系统替代
- ~~Hono.js 依赖~~ - 已从 package.json 中移除
- ~~所有服务端相关的中间件、路由、服务~~ - 已全部清理

## Environment Setup

### Required Environment Variables (可选，用于默认 Agent)
- `ARK_API_KEY` - Volcengine API key for Doubao models
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Claude API key

**注意**: 这些环境变量是可选的。用户也可以通过前端界面配置 API 密钥。

### Agent Configuration
用户通过前端界面配置 API 密钥，Agent Manager 会自动：
1. 注册对应的 Agent 实例
2. 根据提供商类型创建正确的 LangChain 模型
3. 处理 API 调用和错误重试
4. 管理对话历史（可选）

## Supported Diagram Types
- `flowchart` - Business processes, system architecture
- `sequence` - Interaction flows, API calls
- `class` - System design, data structures
- `er` - Database design
- `gitgraph` - Version control workflows
- `gantt` - Project planning
- `pie` - Data statistics
- `journey` - User experience flows

## Development Notes

### TypeScript Configuration
- Base URL aliasing: `@/*` maps to `./src/*`
- Strict mode disabled for flexibility
- React types included

### Styling
- Tailwind CSS with NextUI plugin
- Dark mode support via `darkMode: 'class'`
- Responsive three-panel layout

### LangChain.js 集成
- 版本: `@langchain/core: ^0.3.0`
- 支持的提供商: `@langchain/openai`, `@langchain/anthropic`
- 自定义 Volcengine 提供商适配器
- 统一的 Agent 接口和管理

### Agent 使用模式
```typescript
// 通过 AgentManager 创建和使用 Agent
import { agentManager } from './services/AgentManager';

// 注册 Agent
agentManager.registerAgent('my-volcengine', {
  apiKey: 'your-api-key',
  provider: 'volcengine',
  modelName: 'ep-20250617131345-rshkp'
});

// 生成图表
const result = await agentManager.generateDiagram({
  description: '创建用户登录流程图',
  diagramType: 'flowchart'
}, 'my-volcengine');

// 优化图表
const optimized = await agentManager.optimizeDiagram(
  existingCode,
  '添加错误处理流程',
  'my-volcengine'
);
```

### 错误处理
- LangChain 内置重试机制
- 统一的错误处理和用户提示
- 支持多种 AI 提供商的故障转移
- Agent 连接测试和诊断功能

### 核心优势
1. **无服务器架构**: 完全的前端应用，无需部署服务端
2. **统一的 AI 接口**: 通过 LangChain 支持多种 AI 提供商
3. **可扩展性**: 易于添加新的 AI 提供商和模型
4. **用户体验**: 前端直接调用，减少网络延迟
5. **开发效率**: 简化的架构，更容易维护和调试

## 包管理
- 使用 pnpm 作为包管理器
- 配置文件: `.npmrc`
- 锁文件: `pnpm-lock.yaml`
- 已移除所有服务端相关依赖

## 部署说明
由于采用纯前端架构，应用可以部署到任何静态网站托管服务：
- Vercel, Netlify, GitHub Pages
- CDN + 对象存储
- 任何支持静态文件的 Web 服务器

无需配置服务端环境变量或数据库，用户在前端配置 API 密钥即可使用。