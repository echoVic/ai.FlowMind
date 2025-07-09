# CLAUDE.md

always respond in Chinese

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowMind 是一个基于 React 和 AI 的智能流程图生成应用，用户可以通过自然语言描述快速创建 Mermaid 图表。应用采用三面板布局设计，提供输入、代码编辑和实时预览功能。

**重要架构变更**: ✅ 项目已完全重构为基于 LangChain.js 的纯前端架构，移除了所有服务端代码，实现了真正的无服务器架构。

## Key Commands

### Development (使用 pnpm)
- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production  
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint checks
- `pnpm preview` - Same as start (alias)
- `pnpm install` - Install dependencies

### Next.js 配置要点
- `next.config.js` 包含 Monaco Editor 的特殊配置
- 支持 TypeScript 构建时错误忽略（迁移期间）
- Webpack 配置处理 Monaco Editor 静态资源和 Web Workers
- 输出模式设置为 'standalone' 支持独立部署
- 已移除 NextUI/HeroUI 相关配置，使用纯 Tailwind CSS

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
- **UI Framework**: 纯 Tailwind CSS 样式，无第三方UI库依赖
- **Code Editor**: Monaco Editor for Mermaid code editing
- **Diagram Rendering**: Mermaid.js for diagram visualization
- **AI Integration**: 通过 Agent Manager 统一管理所有 AI 提供商

### AI Agent Architecture (基于 LangChain.js)
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
- ~~`src/agents/BaseAgent.ts`~~ - 已删除，被 LangChain Agent 替代
- ~~Hono.js 依赖~~ - 已从 package.json 中移除
- ~~NextUI/HeroUI 依赖~~ - 已移除，使用纯 Tailwind CSS
- ~~所有服务端相关的中间件、路由、服务~~ - 已全部清理

## Environment Setup

### 环境变量配置 (推荐)

**步骤1：创建环境变量文件**
```bash
# 复制示例文件
cp .env.example .env.local
```

**步骤2：编辑 .env.local 文件**
```bash
# 豆包 (火山引擎) 配置
NEXT_PUBLIC_ARK_API_KEY=your-volcengine-api-key
NEXT_PUBLIC_ARK_MODEL_NAME=ep-20250617131345-rshkp
NEXT_PUBLIC_ARK_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3

# OpenAI 配置 (可选)
# NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
# NEXT_PUBLIC_OPENAI_MODEL_NAME=gpt-4

# Claude 配置 (可选)
# NEXT_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-api-key
# NEXT_PUBLIC_ANTHROPIC_MODEL_NAME=claude-3-sonnet-20240229

# 默认配置
NEXT_PUBLIC_DEFAULT_TEMPERATURE=0.7
NEXT_PUBLIC_DEFAULT_MAX_TOKENS=2048
```

**优先级顺序**：
1. 火山引擎 (NEXT_PUBLIC_ARK_API_KEY) - 推荐
2. OpenAI (NEXT_PUBLIC_OPENAI_API_KEY)
3. Claude (NEXT_PUBLIC_ANTHROPIC_API_KEY)

**注意事项**：
- `.env.local` 文件已在 `.gitignore` 中，不会被提交到版本控制
- 如果未配置环境变量，用户可以通过前端界面手动添加 Agent
- 支持在 Vercel 等平台通过环境变量配置

### 手动配置 Agent (可选)

如果不使用环境变量，用户也可以通过前端界面配置 API 密钥，Agent Manager 会自动：
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
- 纯 Tailwind CSS 实现，无第三方UI库依赖
- Dark mode support via `darkMode: 'class'`
- Responsive three-panel layout
- 所有组件使用原生HTML元素配合Tailwind样式

### LangChain.js 集成
- 版本: `@langchain/core: ^0.3.0`
- 支持的提供商: `@langchain/openai`, `@langchain/anthropic`
- 自定义 Volcengine 提供商适配器
- 统一的 Agent 接口和管理

### AI Agent 调用流程
1. **Agent 注册**: 通过 `AgentManager.registerAgent()` 注册新的 AI 提供商
2. **模型创建**: 根据提供商类型创建对应的 LangChain 模型（ChatOpenAI、ChatAnthropic、VolcengineLangChainProvider）
3. **Agent 实例化**: 使用 DiagramAgentFactory 创建 DiagramAgent 实例
4. **图表生成**: 调用 `generateDiagram()` 或 `optimizeDiagram()` 方法
5. **结果处理**: 返回包含 mermaidCode、explanation 和 metadata 的结构化结果

### 关键设计模式
- **工厂模式**: DiagramAgentFactory 根据配置创建不同的 Agent
- **适配器模式**: VolcengineLangChainProvider 适配火山引擎 API 到 LangChain 接口
- **单例模式**: AgentManager 实例管理所有已注册的 Agent

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
- 已移除 NextUI/HeroUI 依赖，减少包大小

## 部署说明 ✅ Next.js 迁移完成
基于 Next.js 14 App Router 的纯前端架构，应用可以部署到：

### 推荐部署平台
- **Vercel** (最佳选择，Next.js 原生支持)
- **Netlify** (支持 Next.js SSG)
- **GitHub Pages** (需要静态导出)
- **CDN + 对象存储** (阿里云OSS、腾讯云COS等)

### 部署配置
- 构建命令: `pnpm build`
- 输出目录: `.next` (Vercel/Netlify) 或 `out` (静态导出)
- Node.js 版本: >=18.0.0
- 无服务端依赖，支持完全静态化

### 静态导出 (可选)
如需完全静态化，在 `next.config.js` 中添加：
```javascript
output: 'export',
trailingSlash: true,
images: { unoptimized: true }
```

用户无需配置服务端环境，直接在前端界面配置 API 密钥即可使用所有功能。