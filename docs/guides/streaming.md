# 流式输出功能说明

FlowMind 项目支持 AI 模型的流式输出功能，提供更好的用户体验。

## 🚀 流式输出支持状态

### ✅ 完全支持流式输出

- **OpenAI GPT 系列**: 通过 `@langchain/openai` 原生支持
- **Anthropic Claude 系列**: 通过 `@langchain/anthropic` 原生支持

### ❌ 暂不支持流式输出

- **火山引擎豆包**: 自定义适配器，暂未实现流式支持
- **Qwen 通义千问**: 自定义适配器，暂未实现流式支持

### 🔄 自动降级机制

当检测到模型不支持流式输出时，系统会自动降级到普通调用模式，确保功能正常运行。

## 🛠️ 技术实现

### DiagramAgent 流式支持

```typescript
// 支持流式输出的生成方法
async generateDiagram(
  request: DiagramGenerationRequest, 
  onStream?: (chunk: string) => void  // 流式回调函数
): Promise<DiagramGenerationResult>

// 检测模型是否支持流式
private supportsStreaming(): boolean {
  const modelType = this.model._llmType();
  return modelType === 'openai' || modelType === 'anthropic';
}

// 流式调用实现
private async invokeModelStream(
  messages: BaseMessage[], 
  onStream: (chunk: string) => void
): Promise<string> {
  let fullContent = '';
  const stream = await this.model.stream(messages);
  
  for await (const chunk of stream) {
    const content = chunk.content as string;
    if (content) {
      fullContent += content;
      onStream(content);  // 实时回调
    }
  }
  
  return fullContent;
}
```

### 前端集成

```typescript
// 在前端组件中使用流式输出
const handleGenerateDiagram = async (description: string) => {
  const agent = getSelectedAgent();
  
  await agent.generateDiagram(
    { description },
    (chunk: string) => {
      // 实时更新UI显示
      setStreamingContent(prev => prev + chunk);
    }
  );
};
```

## 📱 用户体验

### 支持流式的模型

- ⚡ **实时响应**: 用户可以看到AI逐字生成内容
- 🎯 **即时反馈**: 更快的感知响应速度
- 🔄 **流畅体验**: 减少等待时间的焦虑感

### 不支持流式的模型

- ⏳ **等待模式**: 显示加载状态直到完整响应
- 🔄 **自动降级**: 无需用户干预，自动切换到普通模式
- ✅ **功能完整**: 所有功能正常工作，只是响应方式不同

## 🔧 开发指南

### 火山引擎流式输出实现

火山引擎 API 原生支持流式输出，使用方式如下：

```bash
# 火山引擎流式请求示例
curl https://ark.cn-beijing.volces.com/api/v3/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ARK_API_KEY" \
  -d '{
    "model": "ep-20250617131345-rshkp",
    "messages": [
        {
            "role": "user",
            "content": "创建一个登录流程图"
        }
    ],
    "stream": true
  }'
```

### Qwen 通义千问流式输出实现

Qwen API 完全兼容 OpenAI 格式，原生支持流式输出：

```bash
# Qwen 流式请求示例
curl https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY" \
  -d '{
    "model": "qwen-plus",
    "messages": [
        {
            "role": "user",
            "content": "创建一个登录流程图"
        }
    ],
    "stream": true
  }'
```

```javascript
// JavaScript 实现示例
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
});

async function streamQwen() {
    const completion = await openai.chat.completions.create({
        model: "qwen-plus",
        messages: [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "创建一个登录流程图"}
        ],
        stream: true,
    });
    
    for await (const chunk of completion) {
        console.log(chunk.choices[0]?.delta?.content || '');
    }
}
```

### 添加新的流式支持

如果要为自定义提供商添加流式支持，需要：

1. **实现流式方法**:

```typescript
export class VolcengineLangChainProvider extends BaseChatModel {
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: BaseChatModelCallOptions,
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    // 火山引擎流式响应逻辑
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: messages.map(m => ({ role: m._getType(), content: m.content })),
        stream: true,  // 启用流式输出
        temperature: this.temperature,
        max_tokens: this.maxTokens
      })
    });
    
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield new ChatGenerationChunk({
                message: new AIMessage(content),
                text: content
              });
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  }
}
```

2. **更新支持检测**:

```typescript
private supportsStreaming(): boolean {
  const modelType = this.model._llmType();
  return modelType === 'openai' || 
         modelType === 'anthropic' || 
         modelType === 'volcengine';  // 火山引擎支持流式
}
```

### 测试流式功能

```typescript
// 测试流式输出
const testStreaming = async () => {
  const agent = DiagramAgentFactory.createOpenAIAgent({
    apiKey: 'your-api-key'
  });
  
  let streamedContent = '';
  
  await agent.generateDiagram(
    { description: '创建一个简单的流程图' },
    (chunk) => {
      streamedContent += chunk;
      console.log('收到流式数据:', chunk);
    }
  );
  
  console.log('完整内容:', streamedContent);
};
```

## 🐛 故障排除

### 常见问题

1. **流式输出中断**
   - 检查网络连接稳定性
   - 确认API密钥有效性
   - 查看控制台错误信息

2. **不支持流式的模型显示异常**
   - 系统会自动降级，无需手动处理
   - 检查 `supportsStreaming()` 方法返回值

3. **流式数据格式错误**
   - 确认提供商API返回格式
   - 检查数据解析逻辑

### 调试技巧

```typescript
// 启用详细日志
console.log('DiagramAgent: 流式输出:', onStream ? '启用' : '禁用');
console.log('DiagramAgent: 模型类型:', this.model._llmType());
console.log('DiagramAgent: 支持流式:', this.supportsStreaming());
```

## 🔮 未来计划

### 短期目标

- [ ] 为火山引擎豆包添加流式支持
- [ ] 为 Qwen 通义千问添加流式支持
- [ ] 优化流式数据的解析和显示
- [ ] 在 LangChain 适配器中实现流式支持

### 长期目标

- [ ] 支持更多AI提供商的流式输出
- [ ] 实现流式输出的暂停/恢复功能
- [ ] 添加流式输出的性能监控

## 📞 技术支持

如果在使用流式输出功能时遇到问题：

1. 查看浏览器控制台的错误信息
2. 确认使用的是支持流式的模型（OpenAI/Claude）
3. 检查网络连接和API配置
4. 验证API密钥的有效性和权限
5. 提交 [GitHub Issue](https://github.com/echoVic/flow-ai/issues) 寻求帮助

---

**注意**: 流式输出功能需要稳定的网络连接。在网络不稳定的环境下，系统会自动降级到普通调用模式。
