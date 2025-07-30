# 多轮对话历史架构文档

## 概述

本文档描述了AI图表生成系统中多轮对话历史的架构设计，包括上下文传递机制、状态管理和优化策略。

## 架构设计原则

### 1. 单一职责原则

- **前端层**：负责UI交互和当前消息发送
- **API层**：负责请求转发和响应处理
- **Agent层**：负责对话历史管理和AI交互

### 2. 关注点分离

- 前端不维护对话历史状态
- API层不处理历史消息同步
- Agent内部完全负责历史管理

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        前端层                                │
│  AntdChatInterface.tsx                                      │
│  ├── 用户输入处理                                            │
│  ├── 消息显示管理                                            │
│  └── 只发送当前消息: [{ role: 'user', content: '...' }]      │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP Request
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                        API层                                │
│  /api/chat/route.ts                                         │
│  ├── 请求验证                                               │
│  ├── 提取用户消息: msg.content                               │
│  ├── Agent实例管理                                           │
│  └── 响应格式化                                             │
└─────────────────────┬───────────────────────────────────────┘
                      │ Agent Call
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       Agent层                               │
│  DiagramAgent.ts                                            │
│  ├── conversationHistory: BaseMessage[]                     │
│  ├── buildMessages() - 构建临时消息数组                      │
│  ├── invokeModel() - AI模型调用                             │
│  └── updateConversationHistory() - 保存对话                 │
└─────────────────────────────────────────────────────────────┘
```

## 对话历史管理

### 1. Agent内部状态

```typescript
export class DiagramAgent {
  private conversationHistory: BaseMessage[] = [];
  
  constructor(config: DiagramAgentConfig) {
    // 初始化系统提示
    this.initializeSystemPrompt();
  }
  
  private initializeSystemPrompt(): void {
    this.conversationHistory = [new SystemMessage(this.getSystemPrompt())];
  }
}
```

### 2. 消息处理流程

#### 第一轮对话

```
1. 初始状态: conversationHistory = [SystemMessage]
2. 用户输入: "用户注册登录流程"
3. buildMessages(): [SystemMessage, HumanMessage("用户注册登录流程")]
4. AI生成回复: "回复1"
5. updateConversationHistory(): 
   conversationHistory = [
     SystemMessage,
     HumanMessage("用户注册登录流程"),
     AIMessage("回复1")
   ]
```

#### 第二轮对话

```
1. 当前状态: conversationHistory = [SystemMessage, HumanMessage("..."), AIMessage("回复1")]
2. 用户输入: "请添加验证失败分支"
3. buildMessages(): [
     SystemMessage,
     HumanMessage("用户注册登录流程"),
     AIMessage("回复1"),
     HumanMessage("请添加验证失败分支")  // 临时添加
   ]
4. AI基于完整历史生成回复: "回复2"
5. updateConversationHistory():
   conversationHistory = [
     SystemMessage,
     HumanMessage("用户注册登录流程"),
     AIMessage("回复1"),
     HumanMessage("请添加验证失败分支"),
     AIMessage("回复2")
   ]
```

### 3. 核心方法

#### buildMessages()

```typescript
private buildMessages(userPrompt: string): BaseMessage[] {
  // 创建临时消息数组，不修改conversationHistory
  const messages = [...this.conversationHistory];
  messages.push(new HumanMessage(userPrompt));
  return messages;
}
```

#### updateConversationHistory()

```typescript
private updateConversationHistory(userPrompt: string, response: string): void {
  // 直接添加用户消息和AI回复
  this.conversationHistory.push(
    new HumanMessage(userPrompt),
    new AIMessage(response)
  );

  // 限制历史长度，保持最近20条对话
  const maxHistoryLength = 20;
  if (this.conversationHistory.length > maxHistoryLength + 1) {
    const systemMessages = this.conversationHistory.filter(msg => msg._getType() === 'system');
    const recentMessages = this.conversationHistory
      .filter(msg => msg._getType() !== 'system')
      .slice(-maxHistoryLength);
    
    this.conversationHistory = [...systemMessages, ...recentMessages];
  }
}
```

## 前端实现

### 1. 消息发送逻辑

```typescript
// AntdChatInterface.tsx
const handleSend = useMemoizedFn((content: string) => {
  // 只发送当前用户消息，依赖Agent内部历史管理
  const messagesToSend = [
    { role: 'user', content: userMessage.trim() }
  ];
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messagesToSend,
      model: selectedModel,
      diagramType: currentDiagram.diagramType,
      userId: 'default'
    }),
  });
});
```

### 2. 图表状态同步

```typescript
// 解析图表元数据并自动更新状态
const metadataMatch = fullContent.match(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/);
if (metadataMatch) {
  const metadata = JSON.parse(metadataMatch[1]);
  
  // 自动更新图表状态
  if (metadata.type === 'diagram') {
    setCurrentDiagram({
      ...currentDiagram,
      mermaidCode: metadata.diagramCode,
      diagramType: metadata.diagramType as any,
    });
  }
}
```

## API层实现

### 1. 简化的请求处理

```typescript
// /api/chat/route.ts
export async function POST(req: NextRequest) {
  const { messages, model, diagramType } = await req.json();
  
  // 获取用户消息（简化架构：只处理当前消息）
  let userMessage = '';
  if (messages.length > 0) {
    const msg = messages[0]; // 只取第一条消息
    userMessage = typeof msg === 'string' ? msg : msg.content;
  }
  
  // 获取Agent实例
  let agent = agentManager.getAgent(model);
  if (!agent) {
    agentManager.registerAgent(model, {
      apiKey: apiKey,
      provider: 'volcengine',
      modelName: model,
      enableMemory: true
    });
    agent = agentManager.getAgent(model);
  }
  
  // 直接调用Agent生成图表
  const result = await agentManager.generateDiagramStream({
    description: userMessage,
    diagramType: diagramType || 'flowchart'
  }, onStream, model);
  
  return response;
}
```

## Agent管理

### 1. 全局单例模式

```typescript
// AgentManager.ts
export class AgentManager {
  private agents: Map<string, DiagramAgent> = new Map();
  
  getAgent(key?: string): DiagramAgent | null {
    return this.agents.get(key || 'default') || null;
  }
  
  registerAgent(key: string, config: AgentConfig): void {
    const agent = DiagramAgentFactory.createVolcengineAgent(config);
    this.agents.set(key, agent);
  }
}

// 全局实例
export const agentManager = new AgentManager();
```

### 2. Agent实例生命周期

- **创建**：首次请求时根据模型名称创建
- **复用**：同一模型的后续请求复用同一实例
- **持久化**：Agent实例在应用生命周期内保持存活
- **内存管理**：自动截断过长的对话历史

## 优势与特点

### 1. 架构优势

- **简洁性**：前端只需发送当前消息
- **一致性**：Agent内部完全负责历史管理
- **可靠性**：避免了前后端历史同步的复杂性
- **性能**：减少了网络传输的数据量

### 2. 扩展性

- **多模型支持**：每个模型维护独立的对话历史
- **多用户支持**：可扩展为基于用户ID的历史隔离
- **历史持久化**：可扩展为数据库存储
- **上下文压缩**：支持智能历史压缩策略

### 3. 容错性

- **历史截断**：自动限制历史长度防止内存溢出
- **状态恢复**：Agent实例意外重启时的历史恢复机制
- **错误隔离**：单个对话错误不影响其他对话

## 调试与监控

### 1. 日志记录

```typescript
console.log('使用Agent内部历史管理，当前对话历史长度:', agent.getConversationHistory().length);
console.log('DiagramAgent: 添加对话记录 - 用户:', userPrompt.substring(0, 50) + '...');
console.log('DiagramAgent: 添加对话记录 - 助手:', response.substring(0, 50) + '...');
```

### 2. 历史查看API

```typescript
// /api/chat/history/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const model = searchParams.get('model');
  
  const history = agentManager.getAgentHistory(model || undefined);
  
  return new Response(JSON.stringify({ 
    success: true, 
    model: model || 'default',
    history: history,
    historyLength: history.length
  }));
}
```

## 最佳实践

### 1. 开发建议

- 保持Agent实例的单例性
- 合理设置历史长度限制
- 定期清理不活跃的Agent实例
- 监控内存使用情况

### 2. 性能优化

- 使用流式响应提升用户体验
- 实现智能历史压缩
- 考虑异步历史持久化
- 优化大型对话的处理策略

### 3. 错误处理

- 实现Agent实例的健康检查
- 提供历史恢复机制
- 处理并发访问冲突
- 监控API调用频率和成功率

## 版本历史

- **v1.0** - 初始实现，前端发送完整历史
- **v2.0** - 优化架构，Agent内部管理历史
- **v2.1** - 简化前端逻辑，移除冗余代码
- **v2.2** - 当前版本，完全基于Agent的历史管理

---

*最后更新：2025年1月*
