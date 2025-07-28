# FlowMind 项目架构与技术栈指导文档

## 1. 项目概述

FlowMind 是一个基于 AI 的智能流程图生成工具，允许用户通过自然语言描述快速创建专业的 Mermaid 图表。项目采用前后端分离架构，前端基于 Next.js 构建，后端是一个 MCP（Model Context Protocol）服务器。

### 核心特性

- 多AI引擎支持：支持火山引擎豆包、OpenAI GPT、Claude 等多种AI模型
- 三面板设计：自然语言输入 → 代码编辑 → 实时预览的流畅体验
- 丰富图表类型：流程图、时序图、类图、ER图、甘特图等
- 纯前端架构：无服务器依赖，支持静态部署
- Monaco Editor：专业的代码编辑体验，支持语法高亮和智能补全
- 响应式设计：适配各种屏幕尺寸，支持暗色模式

## 2. 技术架构

### 整体架构

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

### 前后端交互

前端通过 MCP（Model Context Protocol）与后端服务器通信，后端提供了一系列 Mermaid 图表相关的工具服务：

1. 图表语法验证
2. 图表模板获取
3. 图表优化
4. 图表格式转换

## 3. 核心技术栈

### 前端技术栈

- **框架**: Next.js 15 (App Router) + React 18
- **语言**: TypeScript
- **样式**: Tailwind CSS + Ant Design
- **状态管理**: Zustand
- **AI集成**: LangChain.js
- **代码编辑**: CodeMirror + Monaco Editor
- **图表渲染**: Mermaid.js
- **动画效果**: Framer Motion
- **UI组件**: Ant Design + Lucide React 图标库
- **工具库**: ahooks（React Hooks 库）

### 后端技术栈

**注意**: 项目已完全重构为纯前端架构，无需后端服务器。

- **AI集成**: LangChain.js 直接调用 AI 提供商 API
- **数据存储**: 浏览器本地存储 (localStorage)
- **状态管理**: Zustand 全局状态管理
- **API调用**: 直接前端调用，无中间服务器

### 开发工具

- **包管理**: pnpm
- **构建工具**: Turbo
- **代码检查**: ESLint
- **类型检查**: TypeScript

### 核心依赖

- **AI 集成**: `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`
- **UI 组件**: `antd`, `@ant-design/x`, `lucide-react`
- **代码编辑**: `@uiw/react-codemirror`, `codemirror-lang-mermaid`
- **图表渲染**: `mermaid`
- **状态管理**: `zustand`
- **工具库**: `ahooks`, `framer-motion`

## 4. 项目目录结构

```
flow-ai/
├── apps/
│   └── web/                 # 前端应用
│       ├── app/             # Next.js App Router 路由
│       ├── components/      # React 组件
│       ├── lib/             # 工具库和服务
│       │   ├── agents/      # AI Agent 相关
│       │   ├── hooks/       # 自定义 Hooks
│       │   ├── services/    # 业务服务
│       │   └── stores/      # Zustand 状态管理
│       ├── types/           # TypeScript 类型定义
│       ├── next.config.js   # Next.js 配置
│       └── package.json     # 前端依赖
├── package.json             # 根依赖
└── turbo.json              # Turbo 配置
```

## 5. 模块功能说明

### 前端模块

1. **输入面板**: 用户输入自然语言描述的地方
2. **代码编辑器**: 基于 Monaco Editor 的代码编辑区域
3. **实时预览**: 使用 Mermaid.js 渲染图表的预览区域
4. **AI代理**: 基于 LangChain.js 的 DiagramAgent，负责与AI模型交互
5. **状态管理**: 使用 Zustand 管理应用状态

### 后端模块

后端是一个 MCP 服务器，提供以下工具：

1. **validate_mermaid**: 验证 Mermaid 图表语法的正确性
   - 检查语法是否正确
   - 提供具体的错误信息和行号
   - 给出修复建议

2. **get_diagram_templates**: 获取预定义的 Mermaid 图表模板
   - 提供多种图表类型的模板
   - 支持不同复杂度和使用场景
   - 包含完整的示例代码

3. **optimize_diagram**: 优化 Mermaid 图表的布局和可读性
   - 自动优化图表布局和结构
   - 提供可读性改进建议
   - 分析图表复杂度并给出优化方案

4. **convert_diagram_format**: 转换 Mermaid 图表格式
   - 转换不同的 Mermaid 图表类型
   - 优化图表语法结构
   - 标准化图表格式

## 6. 部署指南

### 环境要求

- Node.js >= 18.0.0
- pnpm (推荐) 或 npm

### 部署方式

#### Vercel 部署 (推荐)

1. Fork 项目到 GitHub 账户
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 配置环境变量
4. 部署完成，自动获得 HTTPS 域名

#### 其他平台

- **Netlify**: 支持 Next.js SSG
- **GitHub Pages**: 需要静态导出
- **自建服务器**: 支持 Docker 部署

### 环境变量配置

创建 `.env.local` 文件并配置以下变量：

```bash
# 豆包 (火山引擎) 配置 - 推荐
NEXT_PUBLIC_ARK_API_KEY=your-volcengine-api-key
NEXT_PUBLIC_ARK_MODEL_NAME=ep-20250617131345-rshkp
NEXT_PUBLIC_ARK_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3

# OpenAI 配置 (可选)
# NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
# NEXT_PUBLIC_OPENAI_MODEL_NAME=gpt-4

# Claude 配置 (可选)
# NEXT_PUBLIC_ANTHROPIC_API_KEY=your-anthropic-api-key
# NEXT_PUBLIC_ANTHROPIC_MODEL_NAME=claude-3-sonnet-20240229

# Qwen 配置 (可选)
# NEXT_PUBLIC_QWEN_API_KEY=your-qwen-api-key
# NEXT_PUBLIC_QWEN_MODEL_NAME=qwen-plus

# 默认配置
NEXT_PUBLIC_DEFAULT_TEMPERATURE=0.7
NEXT_PUBLIC_DEFAULT_MAX_TOKENS=2048
```

注意：配置环境变量后，如果开发服务器正在运行，需要重启服务器以确保环境变量被正确加载。在某些情况下，即使 `.env.local` 文件中已配置 API 密钥，也可能需要重启开发服务器才能使配置生效。

### 构建和运行命令

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 运行代码检查
pnpm lint
```

## 7. 开发指南

### 项目启动

1. 克隆项目
2. 安装依赖: `pnpm install`
3. 配置环境变量
4. 启动开发服务器: `pnpm dev`

注意：如果遇到 "Agent not found: default" 错误，请检查环境变量是否正确配置，并尝试重启开发服务器。在某些情况下，即使 `.env.local` 文件中已配置 API 密钥，也需要重启开发服务器才能正确加载配置并初始化默认 Agent。

### 代码结构

- 前端代码主要位于 `apps/web/src` 目录
- 后端代码位于 `packages/mcp-server/src` 目录
- 组件和页面遵循 Next.js App Router 的约定

### 贡献流程

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request