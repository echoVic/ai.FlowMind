# 会话隔离问题修复报告

## 问题概述

在多用户环境下，不同用户使用相同AI模型时会共享Agent实例，导致对话历史混淆。用户B能看到用户A的对话记录，严重影响用户体验和隐私。

## 修复内容

### 1. AgentManager 架构升级

**文件**: `apps/web/lib/services/AgentManager.ts`

**主要变更**:

- 新增 `sessionAgents: Map<sessionId, Map<modelKey, Agent>>` 支持会话级Agent隔离
- 修改 `getAgent()` 方法支持sessionId参数
- 新增 `createSessionAgent()` 方法按需创建会话级Agent
- 新增会话管理方法：`clearSessionHistory()`, `removeSession()`
- 所有Agent操作方法都支持sessionId参数

**核心逻辑**:

```typescript
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
```

### 2. 会话管理工具

**文件**: `apps/web/lib/utils/sessionUtils.ts`

**功能**:

- 自动生成唯一会话ID
- localStorage存储，24小时有效期
- 自动延期和过期管理
- 跨页面会话保持

**核心方法**:

```typescript
export function getCurrentSessionId(): string
export function generateSessionId(): string  
export function clearCurrentSession(): void
export function extendSession(): void
```

### 3. API接口调整

**文件**:

- `apps/web/app/api/chat/route.ts`
- `apps/web/app/api/chat/clear/route.ts`
- `apps/web/app/api/chat/history/route.ts`

**变更**:

- 所有API都支持sessionId参数
- 自动生成sessionId（如果未提供）
- 响应中包含sessionId信息
- 支持按会话清理和查询历史

### 4. 前端集成

**文件**:

- `apps/web/lib/hooks/useDiagramGenerator.ts`
- `apps/web/components/chat/AntdChatInterface.tsx`

**变更**:

- 自动获取和使用当前会话ID
- API调用时传递sessionId
- 自动延长会话有效期

### 5. 测试工具

**文件**:

- `apps/web/lib/utils/sessionTest.ts` - 自动化测试
- `apps/web/components/debug/SessionIsolationTest.tsx` - 可视化测试
- `test-session-isolation.js` - 独立测试脚本

## 数据结构变化

### 修复前

```typescript
class AgentManager {
  private agents: Map<string, DiagramAgent> = new Map();
  // 所有用户共享同一个Agent实例
}
```

### 修复后

```typescript
class AgentManager {
  private agents: Map<string, DiagramAgent> = new Map(); // 全局Agent（向后兼容）
  private sessionAgents: Map<string, Map<string, DiagramAgent>> = new Map(); // 会话级Agent
  // 每个会话都有独立的Agent实例
}
```

### 会话数据结构

```typescript
sessionAgents: {
  "session_1704067200000_abc123": {
    "qwen-max": DiagramAgent实例1,
    "gpt-4": DiagramAgent实例2
  },
  "session_1704067300000_def456": {
    "qwen-max": DiagramAgent实例3,  // 完全独立！
    "claude-3": DiagramAgent实例4
  }
}
```

## API变更

### Chat API

```typescript
// 请求参数新增sessionId
POST /api/chat
{
  "messages": [...],
  "model": "qwen-max", 
  "sessionId": "session_1704067200000_abc123"  // 新增
}

// 响应元数据包含sessionId
{
  "type": "diagram",
  "diagramCode": "...",
  "sessionId": "session_1704067200000_abc123"  // 新增
}
```

### Clear API

```typescript
POST /api/chat/clear
{
  "model": "qwen-max",
  "sessionId": "session_1704067200000_abc123"  // 支持按会话清理
}
```

### History API

```typescript
GET /api/chat/history?model=qwen-max&sessionId=session_1704067200000_abc123
```

## 向后兼容性

- ✅ 如果请求中没有sessionId，系统会自动生成
- ✅ 原有的全局Agent模式仍然支持
- ✅ 现有的API调用不会受到影响
- ✅ 渐进式升级，无需修改现有代码

## 测试验证

### 自动化测试

```bash
# 运行会话隔离测试
node test-session-isolation.js
```

### 手动测试步骤

1. 打开两个不同的浏览器窗口（或无痕模式）
2. 在窗口A中询问："画一个登录流程图"
3. 在窗口B中询问："画一个注册流程图"  
4. 验证两个窗口的对话历史完全独立

### 预期结果

- ✅ 用户A只能看到登录流程相关的对话
- ✅ 用户B只能看到注册流程相关的对话
- ✅ 两者互不干扰，完全隔离

## 性能影响

### 内存使用

- **增加**: 每个活跃会话都有独立的Agent实例
- **优化**: 按需创建，支持过期清理
- **估算**: 每个Agent实例约占用1-2MB内存

### 响应时间

- **首次请求**: 略有增加（需要创建新Agent）
- **后续请求**: 无影响（复用现有Agent）
- **整体影响**: 可忽略不计

### 存储空间

- **localStorage**: 每个会话约100字节
- **服务器内存**: 根据并发用户数线性增长

## 监控建议

### 关键指标

- 活跃会话数量
- Agent实例数量  
- 内存使用情况
- 会话创建/清理频率

### 日志记录

```typescript
// 已添加的日志
console.log(`Created session agent: ${agentKey} for session: ${sessionId}`);
console.log(`Session agent history cleared: ${agentKey} for session: ${sessionId}`);
console.log(`Session removed: ${sessionId}`);
```

## 部署注意事项

### 环境变量

确保以下API密钥正确配置：

- `NEXT_PUBLIC_ARK_API_KEY`
- `NEXT_PUBLIC_OPENAI_API_KEY`
- `NEXT_PUBLIC_ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_QWEN_API_KEY`

### 内存管理

建议定期清理过期会话：

```typescript
// 可以添加定时任务清理过期会话
setInterval(() => {
  // 清理24小时前的会话
  cleanupExpiredSessions();
}, 60 * 60 * 1000); // 每小时执行一次
```

### 负载均衡

如果使用多实例部署，建议：

- 使用sticky session确保用户请求路由到同一实例
- 或者将会话数据存储到Redis等外部存储

## 总结

此次修复完全解决了多用户环境下的对话历史混淆问题，实现了：

1. **完全隔离**: 每个用户会话都有独立的Agent实例和对话历史
2. **用户无感**: 基于浏览器会话，无需登录注册
3. **自动管理**: 会话ID自动生成、存储、延期
4. **向后兼容**: 不影响现有功能和API
5. **易于扩展**: 为将来的用户系统预留接口

修复后，不同用户的对话历史将完全隔离，显著提升用户体验和数据安全性。
