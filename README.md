# FlowMind - AI智能流程图生成器

<div align="center">
  <h3>🤖 基于 AI 的智能流程图生成工具</h3>
  <p>通过自然语言描述，快速创建专业的 Mermaid 图表</p>
  
  [![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![LangChain](https://img.shields.io/badge/LangChain.js-0.3-green?style=flat-square)](https://js.langchain.com/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
</div>

## ✨ 主要特性

- 🤖 **多AI引擎支持** - 支持火山引擎豆包、OpenAI GPT、Claude 等多种AI模型
- 🎨 **三面板设计** - 自然语言输入 → 代码编辑 → 实时预览的流畅体验
- 📊 **丰富图表类型** - 流程图、时序图、类图、ER图、甘特图等
- ⚡ **纯前端架构** - 无服务器依赖，支持静态部署
- 🔧 **Monaco Editor** - 专业的代码编辑体验，支持语法高亮和智能补全
- 🌈 **响应式设计** - 适配各种屏幕尺寸，支持暗色模式
- 💾 **本地存储** - 自动保存历史记录，支持模板库
- 🚀 **实时渲染** - Mermaid.js 驱动的高质量图表渲染

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm (推荐) 或 npm

### 安装运行

```bash
# 克隆项目
git clone https://github.com/echoVic/-FlowMind.git
cd FlowMind

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 文件，添加你的 AI API 密钥

# 启动开发服务器
pnpm dev
```

应用将在 http://localhost:3000 启动。

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

# 默认配置
NEXT_PUBLIC_DEFAULT_TEMPERATURE=0.7
NEXT_PUBLIC_DEFAULT_MAX_TOKENS=2048
```

## 📖 使用指南

### 基本使用

1. **输入描述** - 在左侧面板用自然语言描述你想要的图表
2. **AI生成** - 点击生成按钮，AI会自动创建Mermaid代码
3. **编辑优化** - 在中间的Monaco编辑器中调整代码
4. **实时预览** - 右侧面板实时显示图表效果
5. **保存分享** - 保存到本地历史记录或导出图片

### 支持的图表类型

- **流程图 (Flowchart)** - 业务流程、系统架构
- **时序图 (Sequence)** - API调用、交互流程
- **类图 (Class)** - 系统设计、数据结构
- **ER图 (Entity Relationship)** - 数据库设计
- **甘特图 (Gantt)** - 项目计划、时间安排
- **饼图 (Pie)** - 数据统计、比例展示
- **用户旅程图 (Journey)** - 用户体验流程
- **Git图 (Gitgraph)** - 版本控制工作流

### 示例提示词

```
# 流程图示例
"画一个用户注册流程图，包括输入信息、验证邮箱、创建账户等步骤"

# 时序图示例
"创建一个API调用的时序图，展示客户端、网关、服务和数据库之间的交互"

# 系统架构图示例
"设计一个微服务架构图，包含用户服务、订单服务、支付服务和各自的数据库"
```

## 🏗️ 技术架构

### 核心技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI框架**: React 18 + TypeScript
- **样式系统**: Tailwind CSS
- **状态管理**: Jotai
- **AI集成**: LangChain.js
- **代码编辑**: Monaco Editor
- **图表渲染**: Mermaid.js
- **动画效果**: Framer Motion

### 架构设计

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

## 🚀 部署指南

### Vercel 部署 (推荐)

1. Fork 本仓库到你的 GitHub 账户
2. 在 [Vercel](https://vercel.com) 中导入项目
3. 配置环境变量
4. 部署完成，自动获得 HTTPS 域名

### 其他平台

- **Netlify** - 支持 Next.js SSG
- **GitHub Pages** - 需要静态导出
- **自建服务器** - 支持 Docker 部署

### 静态导出

```bash
# 修改 next.config.js
output: 'export'

# 构建静态文件
pnpm build
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发环境

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行代码检查
pnpm lint

# 构建生产版本
pnpm build
```

## 📝 更新日志

### v1.0.0 (2025-01-09)

- 🎉 首次发布
- ✨ 基于 LangChain.js 的多AI提供商支持
- 🎨 现代化三面板交互设计
- 📊 支持8种主流图表类型
- ⚡ 纯前端架构，无服务器依赖
- 🌈 响应式设计和暗色模式支持

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Mermaid.js](https://mermaid.js.org/) - 强大的图表渲染引擎
- [LangChain.js](https://js.langchain.com/) - AI应用开发框架
- [Next.js](https://nextjs.org/) - React生产框架
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - 专业代码编辑器
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的CSS框架

---

<div align="center">
  <p>用 ❤️ 和 🤖 制作</p>
  <p>
    <a href="https://github.com/echoVic/-FlowMind">GitHub</a> •
    <a href="https://github.com/echoVic/-FlowMind/issues">报告问题</a> •
    <a href="https://github.com/echoVic/-FlowMind/discussions">功能建议</a>
  </p>
</div>