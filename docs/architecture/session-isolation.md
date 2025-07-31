# 会话级隔离解决方案

## 问题描述

在项目部署到网上后，不同用户调用chat接口时，保存到agent的历史会叠加，导致用户之间的对话历史混淆。

### 具体问题

1. **单例模式设计**：AgentManager 是一个全局单例实例，所有用户请求共享同一个实例
2. **基于模型的历史存储**：历史记录按模型类型存储，而不是按用户会话
3. **无用户隔离机制**：没有实现基于用户ID、会话ID或IP的隔离

### 问题示例

- 用户A使用"qwen-max"模型提问："画一个登录流程"
- 用户B也使用"qwen-max"模型提问："画一个注册流程"  
- 用户B会看到用户A的登录流程对话历史，因为他们共享同一个Agent实例

## 解决方案：会话级隔离

在不支持登录体系的情况下，通过会话级隔离来解决用户隔离问题。

### 核心思路

1. **会话ID生成**：为每个浏览器会话生成唯一的sessionId
2. **Agent隔离**：AgentManager支持基于sessionId的Agent隔离
3. **独立历史**：每个sessionId对应独立的Agent实例和对话历史
4. **本地存储**：会话ID存储在localStorage中，24小时有效期

### 技术实现

#### 1. AgentManager 架构调整

```typescript
class AgentManager {
  private agents: Map<string, DiagramAgent> = new Map();
  private sessionAgents: Map<string, Map<string, DiagramAgent>> = new Map(); // sessionId -> modelKey -> agent
  private defaultAgent: DiagramAgent | null = null;
  
  // 支持会话隔离的Agent获取
  getAgent(key?: string, sessionId?: string): DiagramAgent | null {
    if (sessionId) {
      // 优先从会话级Agent中获取
      const sessionAgents = this.sessionAgents.get(sessionId);
      if (sessionAgents?.has(key || 'default')) {
        return sessionAgents.get(key || 'default')!;
      }
      // 如果不存在，创建新的会话级Agent
      return this.createSessionAgent(key || 'default', sessionId);
    }
    // 向后兼容：没有sessionId时使用全局Agent
    return this.agents.get(key || 'default') || this.defaultAgent;
  }
}
```

#### 2. 会话管理工具

```typescript
// apps/web/lib/utils/sessionUtils.ts
export function getCurrentSessionId(): string {
  // 从localStorage获取或生成新的会话ID
  // 24小时有效期，自动延期
}

export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `session_${timestamp}_${random}`;
}
```

#### 3. API接口调整

```typescript
// apps/web/app/api/chat/route.ts
export async function POST(req: NextRequest) {
  const { messages, model, diagramType, userId, sessionId } = body;
  
  // 生成会话ID（如果没有提供）
  const currentSessionId = sessionId || generateSessionId();
  
  // 获取会话级Agent
  let agent = agentManager.getAgent(model, currentSessionId);
  
  // 使用会话级Agent生成图表
  const result = await agentManager.generateDiagramStream(
    request, onStream, model, currentSessionId
  );
}
```

#### 4. 前端集成

```typescript
// 在useDiagramGenerator中
const generateDiagram = async (description?: string) => {
  // 获取当前会话ID
  const sessionId = getCurrentSessionId();
  
  // 使用会话级Agent生成图表
  const result = await agentManager.generateDiagram(request, agentKey, sessionId);
  
  // 延长会话有效期
  extendSession();
};
```

### 数据结构

```
AgentManager
├── agents: Map<string, DiagramAgent>                    // 全局Agent（向后兼容）
├── sessionAgents: Map<sessionId, Map<modelKey, Agent>>  // 会话级Agent
└── defaultAgent: DiagramAgent                           // 默认Agent

sessionAgents 结构示例:
{
  "session_1704067200000_abc123": {
    "qwen-max": DiagramAgent实例1,
    "gpt-4": DiagramAgent实例2
  },
  "session_1704067300000_def456": {
    "qwen-max": DiagramAgent实例3,
    "claude-3": DiagramAgent实例4
  }
}
```

### 会话生命周期

1. **创建**：用户首次访问时自动生成sessionId
2. **存储**：sessionId存储在localStorage中
3. **延期**：每次API调用时自动延长有效期
4. **过期**：24小时后自动过期，下次访问生成新sessionId
5. **清理**：可手动清理过期的会话Agent

### API变更

#### Chat API

```typescript
// 请求参数新增sessionId
POST /api/chat
{
  "messages": [...],
  "model": "qwen-max",
  "diagramType": "flowchart",
  "userId": "default",
  "sessionId": "session_1704067200000_abc123"  // 新增
}

// 响应元数据包含sessionId
{
  "type": "diagram",
  "diagramCode": "...",
  "diagramType": "flowchart",
  "sessionId": "session_1704067200000_abc123"  // 新增
}
```

#### Clear API

```typescript
// 支持按会话清理
POST /api/chat/clear
{
  "model": "qwen-max",
  "sessionId": "session_1704067200000_abc123"  // 新增
}
```

#### History API

```typescript
// 支持按会话获取历史
GET /api/chat/history?model=qwen-max&sessionId=session_1704067200000_abc123

// 响应包含sessionId
{
  "success": true,
  "model": "qwen-max",
  "sessionId": "session_1704067200000_abc123",  // 新增
  "history": [...],
  "historyLength": 4
}
```

### 向后兼容

- 如果请求中没有sessionId，系统会自动生成一个
- 原有的全局Agent模式仍然支持
- 现有的API调用不会受到影响

### 优势

1. **完全隔离**：不同用户的对话历史完全隔离
2. **无需登录**：基于浏览器会话，无需用户注册登录
3. **自动管理**：会话ID自动生成和管理
4. **性能友好**：按需创建Agent，避免内存浪费
5. **易于扩展**：为将来的用户系统预留接口

### 测试验证

可以使用 `sessionTest.ts` 工具进行测试：

```typescript
import { testSessionIsolation } from '@/lib/utils/sessionTest';

// 测试会话隔离
const result = await testSessionIsolation();
console.log(result);
```

### 部署注意事项

1. **环境变量**：确保API密钥正确配置
2. **内存管理**：定期清理过期的会话Agent
3. **监控**：监控会话数量和内存使用情况
4. **日志**：记录会话创建和清理日志

## 总结

通过会话级隔离方案，我们成功解决了多用户环境下对话历史混淆的问题，在不引入复杂用户系统的前提下，实现了有效的用户隔离。该方案具有良好的扩展性和向后兼容性，为项目的进一步发展奠定了基础。
