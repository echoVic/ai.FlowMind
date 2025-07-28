# 更新日志

所有重要的项目变更都会记录在这个文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
并且本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2025-01-15

### 新增
- ✨ 集成 Ant Design 组件库，提供更丰富的 UI 组件
- ✨ 添加 Ant Design X 聊天组件，支持对话式图表生成
- ✨ 新增 CodeMirror 编辑器支持，提供更好的代码编辑体验
- ✨ 添加对话式图表生成面板 `ConversationalDiagramPanel`
- ✨ 新增诊断面板 `DiagnosticPanel` 用于调试和错误诊断
- ✨ 添加验证面板 `ValidationPanel` 用于图表语法验证
- ⚡ 为 DiagramAgent 添加流式输出支持（OpenAI 和 Anthropic 模型）

### 改进
- 🎨 优化三面板布局设计，支持更灵活的面板切换
- 🔧 改进代码编辑器体验，支持 Monaco Editor 和 CodeMirror 双选择
- 📱 增强响应式设计，更好地适配移动设备
- ⚡ 优化 AI 响应处理，提供更好的用户反馈

### 技术更新
- 📦 升级 Next.js 到 15.x 版本
- 📦 添加 `@ant-design/x` 依赖用于聊天组件
- 📦 添加 `@uiw/react-codemirror` 用于代码编辑
- 📦 添加 `codemirror-lang-mermaid` 用于 Mermaid 语法高亮
- 🗑️ 移除不再需要的 `ai` 包依赖，完全基于 LangChain.js 架构
- ⚡ 实现 LangChain 流式输出支持，提升用户体验

### 流式输出支持状态
- ✅ **OpenAI 模型**: 支持真正的流式输出
- ✅ **Anthropic Claude**: 支持真正的流式输出  
- ❌ **火山引擎豆包**: 暂不支持流式，使用普通调用
- ❌ **Qwen 通义千问**: 暂不支持流式，使用普通调用
- 🔄 **自动降级**: 不支持流式的模型会自动降级到普通调用

## [1.0.0] - 2025-01-09

### 新增
- 🎉 首次发布 FlowMind AI 智能流程图生成器
- ✨ 基于 LangChain.js 的多AI提供商支持
  - 支持火山引擎豆包 (Volcengine)
  - 支持 OpenAI GPT 系列
  - 支持 Anthropic Claude 系列
- 🎨 现代化三面板交互设计
  - 自然语言输入面板
  - Monaco Editor 代码编辑器
  - 实时 Mermaid 图表预览
- 📊 支持8种主流图表类型
  - 流程图 (Flowchart)
  - 时序图 (Sequence)
  - 类图 (Class)
  - ER图 (Entity Relationship)
  - 甘特图 (Gantt)
  - 饼图 (Pie)
  - 用户旅程图 (Journey)
  - Git图 (Gitgraph)
- ⚡ 纯前端架构，无服务器依赖
- 🌈 响应式设计和暗色模式支持
- 💾 本地存储支持，自动保存历史记录

### 技术架构
- **前端框架**: Next.js 14 (App Router)
- **UI框架**: React 18 + TypeScript
- **样式系统**: Tailwind CSS
- **状态管理**: Zustand
- **AI集成**: LangChain.js
- **代码编辑**: Monaco Editor
- **图表渲染**: Mermaid.js
- **动画效果**: Framer Motion

### 部署支持
- ✅ Vercel 一键部署
- ✅ Netlify 静态部署
- ✅ GitHub Pages 支持
- ✅ 自建服务器部署
- ✅ Docker 容器化部署

---

## 版本说明

- **主版本号**: 当你做了不兼容的 API 修改
- **次版本号**: 当你做了向下兼容的功能性新增
- **修订号**: 当你做了向下兼容的问题修正

## 贡献指南

如果你想为这个项目做出贡献，请：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 问题反馈

如果你发现了 bug 或有功能建议，请在 [GitHub Issues](https://github.com/echoVic/flow-ai/issues) 中提交。

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。