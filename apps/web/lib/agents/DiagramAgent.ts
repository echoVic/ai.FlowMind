/**
 * 基于 LangChain 的图表生成 Agent
 * 利用 LangChain 的能力实现可复用的 AI 图表生成
 */
import { ChatAnthropic } from "@langchain/anthropic";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseChatModel, BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";
import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// 图表生成请求接口
export interface DiagramGenerationRequest {
  description: string;
  diagramType?: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'journey' | 'gantt' | 'pie' | 'quadrant' | 'mindmap' | 'gitgraph' | 'kanban' | 'architecture' | 'packet';
  existingCode?: string;
  optimizationRequirements?: string;
}

// 图表生成结果接口
export interface DiagramGenerationResult {
  mermaidCode: string;
  explanation: string;
  suggestions: string[];
  diagramType: string;
  metadata: {
    model: string;
    provider: string;
    usage?: {
      totalTokens?: number;
      promptTokens?: number;
      completionTokens?: number;
    };
  };
}

// Agent 配置接口
interface DiagramAgentConfig {
  model: BaseChatModel;
  temperature?: number;
  maxTokens?: number;
  retryCount?: number;
  enableMemory?: boolean;
}

// Qwen Provider 适配器
class QwenLangChainProvider extends BaseChatModel {
  private apiKey: string;
  private endpoint: string;
  private modelName: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: {
    apiKey: string;
    endpoint?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    super({});
    
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.modelName = config.modelName || 'qwen-max';
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 2048;
  }

  async _generate(
    messages: BaseMessage[],
    options: BaseChatModelCallOptions,
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    try {
      console.log('Volcengine API Configuration:', {
        endpoint: this.endpoint,
        modelName: this.modelName,
        hasApiKey: !!this.apiKey,
        hasValidModel: this.modelName.startsWith('ep-') || this.modelName.includes('doubao') || this.modelName.includes('deepseek')
      });
      
      // 验证模型名称格式
      if (!this.modelName.startsWith('ep-') && !this.modelName.includes('doubao') && !this.modelName.includes('deepseek')) {
        console.warn('模型名称可能不正确，火山引擎模型通常以 ep- 开头，例如: ep-20250617131345-rshkp');
      }
      
      const openaiMessages = messages.map(msg => ({
        role: msg._getType() === 'system' ? 'system' : 
              msg._getType() === 'human' ? 'user' : 'assistant',
        content: msg.content as string
      }));

      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: openaiMessages,
          temperature: (options as any).temperature || this.temperature,
          max_tokens: (options as any).maxTokens || this.maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`Qwen API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0].message.content;

      return {
        generations: [
          {
            text: content,
            message: new AIMessage(content)
          }
        ]
      };
    } catch (error: any) {
      throw new Error(`Qwen provider error: ${error.message}`);
    }
  }

  _llmType(): string {
    return 'qwen';
  }

  // 添加流式支持
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: BaseChatModelCallOptions,
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    try {
      console.log('Volcengine API Configuration:', {
        endpoint: this.endpoint,
        modelName: this.modelName,
        hasApiKey: !!this.apiKey,
        hasValidModel: this.modelName.startsWith('ep-') || this.modelName.includes('doubao') || this.modelName.includes('deepseek')
      });
      
      // 验证模型名称格式
      if (!this.modelName.startsWith('ep-') && !this.modelName.includes('doubao') && !this.modelName.includes('deepseek')) {
        console.warn('模型名称可能不正确，火山引擎模型通常以 ep- 开头，例如: ep-20250617131345-rshkp');
      }
      
      const openaiMessages = messages.map(msg => ({
        role: msg._getType() === 'system' ? 'system' : 
              msg._getType() === 'human' ? 'user' : 'assistant',
        content: msg.content as string
      }));

      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: openaiMessages,
          temperature: (options as any).temperature || this.temperature,
          max_tokens: (options as any).maxTokens || this.maxTokens,
          stream: true, // 启用流式输出
        }),
      });

      if (!response.ok) {
        throw new Error(`Qwen API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

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
                  text: content,
                  message: new AIMessageChunk({ content }),
                  generationInfo: {}
                });
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Qwen streaming error: ${error.message}`);
    }
  }
}

// Volcengine Provider 适配器
class VolcengineLangChainProvider extends BaseChatModel {
  private apiKey: string;
  private endpoint: string;
  private modelName: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: {
    apiKey: string;
    endpoint?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
  }) {
    super({});
    
    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint || process.env.NEXT_PUBLIC_ARK_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3';
    this.modelName = config.modelName || process.env.NEXT_PUBLIC_ARK_MODEL_NAME || 'ep-20250617131345-rshkp';
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 2048;
    
    if (!this.apiKey) {
      throw new Error('Volcengine API key is required');
    }
    if (!this.modelName) {
      throw new Error('Volcengine model name is required');
    }
    
    // 确保 endpoint 以 /v3 结尾，用于火山引擎 API
    if (!this.endpoint.endsWith('/v3') && !this.endpoint.endsWith('/v3/')) {
      this.endpoint = this.endpoint.replace(/\/?$/, '/v3');
    }
  }

  async _generate(
    messages: BaseMessage[],
    options: BaseChatModelCallOptions,
    runManager?: CallbackManagerForLLMRun
  ): Promise<ChatResult> {
    try {
      const openaiMessages = messages.map(msg => ({
        role: msg._getType() === 'system' ? 'system' : 
              msg._getType() === 'human' ? 'user' : 'assistant',
        content: msg.content as string
      }));

      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: openaiMessages,
          temperature: (options as any).temperature || this.temperature,
          max_tokens: (options as any).maxTokens || this.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        let errorMessage = `Volcengine API error: ${response.status}`;
        
        if (response.status === 404) {
          errorMessage += ' - Model not found or endpoint incorrect. Please check your model name and endpoint configuration.';
        } else if (response.status === 401) {
          errorMessage += ' - Authentication failed. Please check your API key.';
        } else if (response.status === 400) {
          errorMessage += ' - Bad request. Please check your request parameters.';
        }
        
        if (errorText) {
          errorMessage += ` Details: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      const content = result.choices[0].message.content;

      return {
        generations: [
          {
            text: content,
            message: new AIMessage(content)
          }
        ]
      };
    } catch (error: any) {
      throw new Error(`Volcengine provider error: ${error.message}`);
    }
  }

  _llmType(): string {
    return 'volcengine';
  }

  // 添加流式支持
  async *_streamResponseChunks(
    messages: BaseMessage[],
    options: BaseChatModelCallOptions,
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    try {
      const openaiMessages = messages.map(msg => ({
        role: msg._getType() === 'system' ? 'system' : 
              msg._getType() === 'human' ? 'user' : 'assistant',
        content: msg.content as string
      }));

      const response = await fetch(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: openaiMessages,
          temperature: (options as any).temperature || this.temperature,
          max_tokens: (options as any).maxTokens || this.maxTokens,
          stream: true, // 启用流式输出
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        let errorMessage = `Volcengine API error: ${response.status}`;
        
        if (response.status === 404) {
          errorMessage += ' - Model not found or endpoint incorrect. Please check your model name and endpoint configuration.';
        } else if (response.status === 401) {
          errorMessage += ' - Authentication failed. Please check your API key.';
        } else if (response.status === 400) {
          errorMessage += ' - Bad request. Please check your request parameters.';
        }
        
        if (errorText) {
          errorMessage += ` Details: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

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
                  text: content,
                  message: new AIMessageChunk({ content }),
                  generationInfo: {}
                });
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error: any) {
      throw new Error(`Volcengine streaming error: ${error.message}`);
    }
  }
}

/**
 * 基于 LangChain 的图表生成 Agent
 */
export class DiagramAgent {
  private model: BaseChatModel;
  private config: DiagramAgentConfig;
  private conversationHistory: BaseMessage[] = [];

  constructor(config: DiagramAgentConfig) {
    this.config = config;
    this.model = config.model;
    
    // 初始化系统提示
    this.initializeSystemPrompt('generation');
  }

  /**
   * 生成图表 (支持流式输出)
   */
  async generateDiagram(
    request: DiagramGenerationRequest, 
    onStream?: (chunk: string) => void
  ): Promise<DiagramGenerationResult> {
    try {
      console.log('DiagramAgent: 开始生成图表');
      console.log('- 描述:', request.description);
      console.log('- 图表类型:', request.diagramType);
      console.log('- 现有代码:', request.existingCode ? '存在' : '不存在');
      console.log('- 流式输出:', onStream ? '启用' : '禁用');

      // 构建提示消息
      const userPrompt = this.buildGenerationPrompt(request);
      const messages = this.buildMessages(userPrompt, request);

      // 调用 AI 模型
      const response = await this.invokeModel(messages, onStream);
      
      // 解析响应
      const result = this.parseResponse(response, request);
      
      // 更新对话历史
      if (this.config.enableMemory) {
        console.log('DiagramAgent: 更新对话历史');
        this.updateConversationHistory(userPrompt, response);
        console.log('DiagramAgent: 当前对话历史长度:', this.conversationHistory.length);
      }

      console.log('DiagramAgent: 图表生成完成');
      return result;

    } catch (error: any) {
      console.error('DiagramAgent: 图表生成失败', error);
      throw new Error(`图表生成失败: ${error.message}`);
    }
  }

  /**
   * 优化图表
   */
  async optimizeDiagram(mermaidCode: string, requirements: string): Promise<DiagramGenerationResult> {
    // 临时切换到优化上下文
    const originalHistory = [...this.conversationHistory];
    this.initializeSystemPrompt('optimization');
    
    try {
      const request: DiagramGenerationRequest = {
        description: requirements,
        existingCode: mermaidCode,
        optimizationRequirements: requirements
      };

      return await this.generateDiagram(request);
    } finally {
      // 恢复原始对话历史
      this.conversationHistory = originalHistory;
    }
  }

  /**
   * 批量生成图表
   */
  async batchGenerateDiagrams(requests: DiagramGenerationRequest[]): Promise<DiagramGenerationResult[]> {
    // 临时切换到批量生成上下文
    const originalHistory = [...this.conversationHistory];
    this.initializeSystemPrompt('batch');
    
    try {
      const results = await Promise.all(
        requests.map(request => this.generateDiagram(request))
      );
      return results;
    } finally {
      // 恢复原始对话历史
      this.conversationHistory = originalHistory;
    }
  }

  /**
   * 清空对话历史
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.initializeSystemPrompt('generation');
  }

  /**
   * 设置对话历史
   */
  setConversationHistory(history: Array<{role: string, content: string}>): void {
    this.conversationHistory = [new SystemMessage(this.getOptimizedSystemPrompt())];
    
    for (const msg of history) {
      if (msg.role === 'user') {
        this.conversationHistory.push(new HumanMessage(msg.content));
      } else if (msg.role === 'assistant') {
        this.conversationHistory.push(new AIMessage(msg.content));
      }
    }
    
    console.log('DiagramAgent: 设置对话历史完成，共', this.conversationHistory.length - 1, '条消息');
  }

  /**
   * 获取对话历史
   */
  getConversationHistory(): Array<{role: string, content: string}> {
    return this.conversationHistory
      .filter(msg => msg._getType() !== 'system') // 排除系统消息
      .map(msg => ({
        role: msg._getType() === 'human' ? 'user' : 'assistant',
        content: msg.content as string
      }));
  }

  /**
   * 获取系统提示
   */
  private getSystemPrompt(): string {
    return this.getOptimizedSystemPrompt();
  }

  /**
   * 获取优化的系统提示词
   */
  private getOptimizedSystemPrompt(): string {
    return `你是专业的 Mermaid 图表生成专家。

核心规则：
1. 严格使用标准 Mermaid 语法
2. 节点ID必须符合规范：字母开头，可含字母数字下划线
3. 避免保留关键字：end, start, class, state 等，改用 endNode, startNode 等
4. 中文标签格式：nodeId[中文标签]，标签内避免换行符和特殊符号
5. 箭头前后加空格：nodeA --> nodeB

返回格式（严格JSON）：
{
  "mermaidCode": "完整的mermaid代码",
  "explanation": "简要说明",
  "suggestions": ["建议1", "建议2"],
  "diagramType": "图表类型"
}

示例：
{
  "mermaidCode": "flowchart TD\\n    startNode[开始] --> processNode[处理数据]\\n    processNode --> endNode[结束]",
  "explanation": "简单的流程图",
  "suggestions": ["可添加更多步骤", "优化节点布局"],
  "diagramType": "flowchart"
}

支持类型：flowchart, sequence, class, state, er, journey, gantt, pie, quadrant, mindmap, gitgraph, kanban, architecture, packet`;
  }

  /**
   * 获取针对特定场景的系统提示词
   */
  private getContextualSystemPrompt(context: 'optimization' | 'generation' | 'batch'): string {
    const basePrompt = this.getOptimizedSystemPrompt();
    
    switch (context) {
      case 'optimization':
        return basePrompt + `\n\n特别注意：这是优化任务，请保持原有图表的核心结构，只进行必要的改进。`;
      
      case 'batch':
        return basePrompt + `\n\n特别注意：这是批量生成任务，请确保每个图表都独立完整，风格保持一致。`;
      
      case 'generation':
      default:
        return basePrompt;
    }
  }

  /**
   * 初始化系统提示
   */
  private initializeSystemPrompt(context: 'optimization' | 'generation' | 'batch' = 'generation'): void {
    const systemPrompt = this.getContextualSystemPrompt(context);
    this.conversationHistory = [new SystemMessage(systemPrompt)];
  }

  /**
   * 构建生成提示
   */
  private buildGenerationPrompt(request: DiagramGenerationRequest): string {
    if (request.existingCode && request.optimizationRequirements) {
      return `请根据以下要求优化架构图：

当前Mermaid代码：
\`\`\`mermaid
${request.existingCode}
\`\`\`

优化要求：${request.optimizationRequirements}

请保持原有结构的基础上，根据要求进行优化改进。`;
    }

    if (request.existingCode) {
      return `请基于现有代码进行优化和扩展：

现有代码：
\`\`\`mermaid
${request.existingCode}
\`\`\`

新需求：${request.description}
建议图表类型：${request.diagramType || '自动选择最合适的类型'}

请保持原有结构的基础上，根据新需求进行优化。`;
    }

    return `请根据以下描述生成架构图：

需求描述：${request.description}
建议图表类型：${request.diagramType || '请自动选择最合适的图表类型'}

请生成清晰、专业的架构图代码。`;
  }

  /**
   * 构建消息列表
   */
  private buildMessages(userPrompt: string, request?: DiagramGenerationRequest): BaseMessage[] {
    // 创建临时消息数组，不修改conversationHistory
    const messages = [...this.conversationHistory];
    
    // 根据请求类型动态调整系统提示
    if (request && messages.length > 0 && messages[0]._getType() === 'system') {
      const context = this.determineContext(request);
      if (context !== 'generation') {
        messages[0] = new SystemMessage(this.getContextualSystemPrompt(context));
      }
    }
    
    messages.push(new HumanMessage(userPrompt));
    return messages;
  }

  /**
   * 根据请求确
   */
  private determineContext(request: DiagramGenerationRequest): 'optimization' | 'generation' | 'batch' {
    if (request.existingCode && request.optimizationRequirements) {
      return 'optimization';
    }
    return 'generation';
  }

  /**
   * 调用 AI 模型 (支持流式输出)
   */
  private async invokeModel(messages: BaseMessage[], onStream?: (chunk: string) => void): Promise<string> {
    const retryCount = this.config.retryCount || 3;
    
    for (let i = 0; i < retryCount; i++) {
      try {
        // 如果支持流式输出且提供了回调函数
        if (onStream && this.supportsStreaming()) {
          return await this.invokeModelStream(messages, onStream);
        }
        
        // 非流式调用
        const response = await this.model.invoke(messages);
        return response.content as string;
        
      } catch (error: any) {
        console.warn(`DiagramAgent: 调用失败，重试 ${i + 1}/${retryCount}`, error.message);
        await this.sleep(1000 * (i + 1));
      }
    }
    
    throw new Error('AI 模型调用失败');
  }

  /**
   * 流式调用 AI 模型
   */
  private async invokeModelStream(messages: BaseMessage[], onStream: (chunk: string) => void): Promise<string> {
    let fullContent = '';
    
    try {
      const stream = await this.model.stream(messages);
      
      for await (const chunk of stream) {
        const content = chunk.content as string;
        if (content) {
          fullContent += content;
          onStream(content);
        }
      }
      
      return fullContent;
    } catch (error: any) {
      console.error('DiagramAgent: 流式调用失败', error);
      // 降级到非流式调用
      const response = await this.model.invoke(messages);
      return response.content as string;
    }
  }

  /**
   * 检查模型是否支持流式输出
   */
  public supportsStreaming(): boolean {
    const modelType = this.model._llmType();
    // OpenAI、Anthropic、火山引擎、Qwen 都支持流式输出
    return modelType === 'openai' || 
           modelType === 'anthropic' || 
           modelType === 'volcengine' || 
           modelType === 'qwen';
  }

  /**
   * 安全预处理 Mermaid 代码 - 避免过度处理
   */
  private preprocessMermaidCode(code: string): string {
    return this.preprocessMermaidCodeSafely(code);
  }

  /**
   * 安全预处理 Mermaid 代码的实现
   */
  private preprocessMermaidCodeSafely(code: string): string {
    console.log('开始安全预处理 Mermaid 代码');
    
    // 首先检查是否真的需要预处理
    if (!this.needsPreprocessing(code)) {
      console.log('代码无需预处理，保持原样');
      return code;
    }
    
    const lines = code.split('\n');
    let hasChanges = false;
    
    const processedLines = lines.map((line, index) => {
      let processedLine = line.trim();
      
      // 跳过注释和声明行
      if (!processedLine || 
          processedLine.startsWith('%%') || 
          /^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|gitgraph|gantt|pie)/i.test(processedLine)) {
        return processedLine;
      }
      
      const originalLine = processedLine;
      
      // 只处理明确的保留关键字问题
      const reservedKeywords = ['end', 'start', 'class', 'state'];
      const replacements = { 
        'end': 'endNode', 
        'start': 'startNode', 
        'class': 'classNode', 
        'state': 'stateNode' 
      };
      
      for (const [keyword, replacement] of Object.entries(replacements)) {
        // 只匹配作为独立节点ID的情况
        const nodeIdPattern = new RegExp(`\\b${keyword}\\b(?=\\s*[\\[\\(\\{]|\\s*-->)`, 'gi');
        if (nodeIdPattern.test(processedLine)) {
          processedLine = processedLine.replace(nodeIdPattern, replacement);
          console.log(`第${index + 1}行: 替换保留关键字 ${keyword} -> ${replacement}`);
          hasChanges = true;
        }
      }
      
      // 修复明显的箭头格式问题 - 只处理单箭头，避免破坏序列图语法
      processedLine = processedLine
        .replace(/(\w+)-->(?!>)/g, '$1 -->')
        .replace(/(?<!-)-->(\w+)/g, '--> $1');
      
      if (processedLine !== originalLine && !hasChanges) {
        hasChanges = true;
        console.log(`第${index + 1}行: 修复了箭头格式`);
      }
      
      return processedLine;
    });
    
    const result = processedLines.join('\n');
    
    if (hasChanges) {
      console.log('预处理完成，已修复必要的语法问题');
    } else {
      console.log('预处理完成，无需修改');
    }
    
    return result;
  }

  /**
   * 检查代码是否需要预处理
   */
  private needsPreprocessing(code: string): boolean {
    // 检查是否包含保留关键字作为节点ID
    const reservedKeywords = ['end', 'start', 'class', 'state'];
    const lines = code.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // 跳过注释和声明行
      if (!trimmedLine || 
          trimmedLine.startsWith('%%') || 
          /^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|gitgraph|gantt|pie)/i.test(trimmedLine)) {
        continue;
      }
      
      // 检查保留关键字
      for (const keyword of reservedKeywords) {
        const nodeIdPattern = new RegExp(`\\b${keyword}\\b(?=\\s*[\\[\\(\\{]|\\s*-->)`, 'i');
        if (nodeIdPattern.test(trimmedLine)) {
          console.log(`发现需要处理的保留关键字: ${keyword}`);
          return true;
        }
      }
      
      // 检查箭头格式问题 - 只检查单箭头，避免误判序列图的双箭头
      if (/(\w+)-->(?!>)/.test(trimmedLine) || /(?<!-)-->(\w+)/.test(trimmedLine)) {
        console.log('发现需要修复的箭头格式');
        return true;
      }
    }
    
    return false;
  }

  /**
   * 修复中文标签格式问题 - 保守策略，只修复明确的问题
   */
  private fixChineseLabels(line: string): string {
    let fixedLine = line;
    
    // 只处理明确有问题的情况，避免误伤正常语法
    
    // 1. 只修复标签内部包含实际换行符的情况（不是 \\n 转义符）
    // 这里使用更精确的匹配，确保不会误伤正常的 Mermaid 语法
    fixedLine = fixedLine.replace(/\[([^[\]]*)\n([^[\]]*)\]/g, '[$1 $2]');  // 实际换行符
    fixedLine = fixedLine.replace(/\[([^[\]]*)\r\n([^[\]]*)\]/g, '[$1 $2]'); // Windows换行符
    fixedLine = fixedLine.replace(/\[([^[\]]*)\r([^[\]]*)\]/g, '[$1 $2]');   // Mac换行符
    
    // 2. 只处理明显的中文符号问题，保留可能的 Mermaid 语法符号
    // 使用更保守的匹配，只替换明确的中文标点符号
    fixedLine = fixedLine.replace(/\[([^[\]]*[（）、，。！？；："'【】《》]+[^[\]]*)\]/g, (match, content) => {
      // 只替换明显的中文符号，保留可能的 Mermaid 语法符号
      const cleaned = content
        .replace(/（/g, '(').replace(/）/g, ')')
        .replace(/，/g, ' ').replace(/。/g, '.') // 中文逗号替换为空格，避免语法错误
        .replace(/！/g, '!').replace(/？/g, '?')
        .replace(/；/g, ';').replace(/：/g, ':')
        .replace(/"/g, '"').replace(/"/g, '"')
        .replace(/'/g, "'").replace(/'/g, "'")
        .replace(/【/g, '[').replace(/】/g, ']')
        .replace(/《/g, '<').replace(/》/g, '>');
      return `[${cleaned}]`;
    });
    
    // 3. 只修复明显过长的标签（超过50个字符），避免误伤正常内容
    fixedLine = fixedLine.replace(/\[([^[\]]{50,})\]/g, (match, content) => {
      // 如果标签过长，截取前30个字符并添加省略号
      const simplified = content.length > 30 ? content.substring(0, 30) + '...' : content;
      return `[${simplified}]`;
    });
    
    // 4. 只移除标签中明确的控制字符，保留正常空格和内容
    fixedLine = fixedLine.replace(/\[([^[\]]*)\]/g, (match, content) => {
      // 只替换明确的控制字符，保留正常的空格和内容结构
      const cleaned = content
        .replace(/[\r\n\t]/g, ' ')  // 只替换控制字符为空格
        .replace(/\s{3,}/g, ' ')    // 只合并3个以上的连续空格
        .replace(/^\s+|\s+$/g, ''); // 只移除首尾空格
      return `[${cleaned}]`;
    });
    
    return fixedLine;
  }

  /**
   * 验证节点ID是否符合规范
   */
  private validateNodeId(nodeId: string): string {
    // 确保节点ID符合规范：字母开头，可包含字母、数字、下划线
    if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(nodeId)) {
      return nodeId;
    }
    
    // 如果不符合规范，生成安全的节点ID
    const safeId = nodeId
      .replace(/[^a-zA-Z0-9_]/g, '')  // 移除非法字符
      .replace(/^[0-9]/, 'node$&');   // 如果以数字开头，添加前缀
      
    return safeId || 'defaultNode';
  }

  /**
   * 转义特殊字符
   */
  private escapeSpecialChars(text: string): string {
    return text
      .replace(/\\/g, '\\\\')  // 转义反斜杠
      .replace(/"/g, '\\"')    // 转义双引号
      .replace(/'/g, "\\'")    // 转义单引号
      .replace(/\n/g, '\\n')   // 转义换行符
      .replace(/\r/g, '\\r')   // 转义回车符
      .replace(/\t/g, '\\t');  // 转义制表符
  }

  /**
   * 解析响应 - 使用健壮的多策略解析
   */
  private parseResponse(response: string, request: DiagramGenerationRequest): DiagramGenerationResult {
    return this.parseResponseRobustly(response, request);
  }

  /**
   * 健壮的响应解析实现
   */
  private parseResponseRobustly(response: string, request: DiagramGenerationRequest): DiagramGenerationResult {
    console.log('开始解析响应:', response.substring(0, 100) + '...');
    
    // 策略1: 尝试提取 JSON - 改进匹配逻辑
    let jsonMatch = response.match(/\{[\s\S]*\}/);
    
    // 如果贪婪匹配失败，尝试找到完整的JSON对象
    if (!jsonMatch) {
      // 寻找第一个 { 和对应的 }
      const startIndex = response.indexOf('{');
      if (startIndex !== -1) {
        let braceCount = 0;
        let endIndex = -1;
        
        for (let i = startIndex; i < response.length; i++) {
          if (response[i] === '{') braceCount++;
          if (response[i] === '}') braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
        
        if (endIndex !== -1) {
          jsonMatch = [response.substring(startIndex, endIndex + 1)];
        }
      }
    }
    
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.mermaidCode) {
          console.log('策略1成功: 解析到有效JSON');
          return this.buildValidResult(parsed, request);
        }
      } catch (e) {
        console.log('JSON 解析失败，尝试修复');
        try {
          const fixed = this.fixJsonString(jsonMatch[0]);
          const parsed = JSON.parse(fixed);
          console.log('策略1成功: JSON修复后解析成功');
          return this.buildValidResult(parsed, request);
        } catch (e2) {
          console.log('JSON 修复也失败，继续其他策略');
        }
      }
    }
    
    // 策略2: 提取 Mermaid 代码块
    const mermaidMatch = response.match(/```mermaid\s*\n([\s\S]*?)\n```/) || 
                        response.match(/```mermaid\s*\n([\s\S]*?)```/);
    if (mermaidMatch) {
      console.log('策略2成功: 找到Mermaid代码块');
      const mermaidCode = this.preprocessMermaidCodeSafely(mermaidMatch[1]);
      return this.buildDefaultResult(mermaidCode, request);
    }
    
    // 策略3: 检测纯 Mermaid 代码
    if (this.looksLikeMermaidCode(response)) {
      console.log('策略3成功: 检测到纯Mermaid代码');
      const cleanCode = this.preprocessMermaidCodeSafely(response.trim());
      return this.buildDefaultResult(cleanCode, request);
    }
    
    // 策略4: 最后的兜底
    console.error('所有解析策略都失败');
    return this.buildDefaultResult('flowchart TD\n    A[解析失败] --> B[请重试]', request);
  }

  /**
   * 检测文本是否看起来像Mermaid代码
   */
  private looksLikeMermaidCode(text: string): boolean {
    const mermaidKeywords = ['flowchart', 'graph', 'sequenceDiagram', 'classDiagram', '-->', '---'];
    return mermaidKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * 构建有效的解析结果
   */
  private buildValidResult(parsed: any, request: DiagramGenerationRequest): DiagramGenerationResult {
    let mermaidCode = parsed.mermaidCode || '';
    
    // 清理代码块标记
    mermaidCode = mermaidCode
      .replace(/^```mermaid\s*\n?/i, '')
      .replace(/^```\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    
    // 安全预处理
    mermaidCode = this.preprocessMermaidCodeSafely(mermaidCode);
    
    return {
      mermaidCode,
      explanation: parsed.explanation || '已生成图表',
      suggestions: parsed.suggestions || ['可进一步优化'],
      diagramType: parsed.diagramType || this.detectDiagramType(mermaidCode),
      metadata: {
        model: this.model._llmType(),
        provider: this.getProviderName()
      }
    };
  }

  /**
   * 构建默认解析结果
   */
  private buildDefaultResult(mermaidCode: string, request: DiagramGenerationRequest): DiagramGenerationResult {
    const detectedType = this.detectDiagramType(mermaidCode);
    
    return {
      mermaidCode,
      explanation: '已生成Mermaid图表代码',
      suggestions: ['可以进一步优化图表结构', '添加更多详细信息', '调整图表样式'],
      diagramType: detectedType || request.diagramType || 'flowchart',
      metadata: {
        model: this.model._llmType(),
        provider: this.getProviderName()
      }
    };
  }

  /**
   * 修复JSON字符串中的控制字符
   */
  private fixJsonString(jsonString: string): string {
    try {
      // 首先尝试直接解析
      return JSON.parse(jsonString);
    } catch (error) {
      console.log('DiagramAgent: JSON解析失败，开始修复');
      
      // 方法1: 精确处理 mermaidCode 字段
      try {
        const mermaidCodeRegex = /"mermaidCode"\s*:\s*"((?:[^"\\]|\\.)*)"/;
        const match = jsonString.match(mermaidCodeRegex);
        
        if (match) {
          const originalValue = match[1];
          
          // 正确处理转义：保持已转义的内容不变，只转义未转义的内容
          const fixedValue = originalValue
            // 先处理已经正确转义的内容，用占位符保护
            .replace(/\\"/g, '__ESCAPED_QUOTE__')
            .replace(/\\n/g, '__ESCAPED_NEWLINE__')
            .replace(/\\r/g, '__ESCAPED_CARRIAGE__')
            .replace(/\\t/g, '__ESCAPED_TAB__')
            .replace(/\\\\/g, '__ESCAPED_BACKSLASH__')
            // 转义未转义的特殊字符
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/\\/g, '\\\\')
            // 恢复已正确转义的内容
            .replace(/__ESCAPED_BACKSLASH__/g, '\\\\')
            .replace(/__ESCAPED_QUOTE__/g, '\\"')
            .replace(/__ESCAPED_NEWLINE__/g, '\\n')
            .replace(/__ESCAPED_CARRIAGE__/g, '\\r')
            .replace(/__ESCAPED_TAB__/g, '\\t');
          
          const fixedJson = jsonString.replace(match[0], `"mermaidCode": "${fixedValue}"`);
          
          // 测试解析
          JSON.parse(fixedJson);
          return fixedJson;
        }
      } catch (error2) {
        console.log('DiagramAgent: 精确修复失败，尝试分段重构');
      }
      
      // 方法2: 分段重构JSON
      try {
        return this.reconstructJson(jsonString);
      } catch (error3) {
        console.log('DiagramAgent: 所有修复方法都失败');
        
        // 返回默认的有效JSON
        return JSON.stringify({
          mermaidCode: 'graph TD\n    A[解析失败] --> B[请重试]',
          explanation: 'JSON解析失败，已生成默认图表',
          suggestions: ['检查AI响应格式', '重新生成', '简化描述'],
          diagramType: 'flowchart'
        });
      }
    }
  }

  /**
   * 重构JSON字符串
   */
  private reconstructJson(jsonString: string): string {
    // 提取各个字段的值
    const fields = {
      mermaidCode: this.extractJsonField(jsonString, 'mermaidCode'),
      explanation: this.extractJsonField(jsonString, 'explanation') || '代码重构失败',
      suggestions: this.extractJsonArrayField(jsonString, 'suggestions') || ['请重试', '简化描述'],
      diagramType: this.extractJsonField(jsonString, 'diagramType') || 'flowchart'
    };
    
    // 如果无法提取到 mermaidCode，抛出异常
    if (!fields.mermaidCode) {
      throw new Error('无法从JSON中提取mermaidCode字段');
    }
    
    return JSON.stringify(fields);
  }

  /**
   * 提取JSON字段值
   */
  private extractJsonField(jsonString: string, fieldName: string): string | null {
    // 尝试多种匹配模式
    const patterns = [
      new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 'i'),
      new RegExp(`"${fieldName}"\\s*:\\s*'([^']*(?:\\\\.[^']*)*)'`, 'i'),
      new RegExp(`${fieldName}\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = jsonString.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * 提取JSON数组字段值
   */
  private extractJsonArrayField(jsonString: string, fieldName: string): string[] | null {
    const pattern = new RegExp(`"${fieldName}"\\s*:\\s*\\[([^\\]]*?)\\]`, 'i');
    const match = jsonString.match(pattern);
    
    if (match) {
      try {
        const arrayContent = match[1];
        // 简单解析数组内容
        const items = arrayContent.split(',').map(item => {
          const trimmed = item.trim();
          // 移除引号
          return trimmed.replace(/^["']|["']$/g, '');
        });
        return items.filter(item => item.length > 0);
      } catch (error) {
        console.log('DiagramAgent: 数组字段解析失败');
      }
    }
    
    return null;
  }

  /**
   * 验证和清理响应数据
   */
  private validateAndCleanResponse(parsed: any): any {
    // 创建更宽松的验证模式，提供默认值
    const schema = z.object({
      mermaidCode: z.string().default('graph TD\n    A[默认] --> B[图表]'),
      explanation: z.string().default('已生成默认图表'),
      suggestions: z.array(z.string()).default(['优化图表结构', '添加更多细节']),
      diagramType: z.string().default('flowchart')
    });

    try {
      // 先进行基本验证和清理
      const cleanedData = {
        mermaidCode: typeof parsed.mermaidCode === 'string' ? parsed.mermaidCode : 'graph TD\n    A[解析错误] --> B[请重试]',
        explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '响应解析失败',
        suggestions: Array.isArray(parsed.suggestions) ? 
          parsed.suggestions.filter(s => typeof s === 'string') : 
          ['检查输入', '重新生成'],
        diagramType: typeof parsed.diagramType === 'string' ? parsed.diagramType : 'flowchart'
      };

      // 确保suggestions不为空
      if (cleanedData.suggestions.length === 0) {
        cleanedData.suggestions = ['优化图表结构', '添加更多细节'];
      }

      return schema.parse(cleanedData);
    } catch (error) {
      console.warn('DiagramAgent: 响应验证失败，使用默认值:', error);
      
      // 返回默认响应
      return {
        mermaidCode: 'graph TD\n    A[验证失败] --> B[使用默认]',
        explanation: '响应验证失败，已生成默认图表',
        suggestions: ['检查AI响应格式', '重新生成', '简化描述'],
        diagramType: 'flowchart'
      };
    }
  }

  /**
   * 自动检测图表类型
   */
  private detectDiagramType(code: string): string {
    const trimmedCode = code.trim();
    
    // 检测各种图表类型
    if (trimmedCode.includes('sequenceDiagram')) {
      return 'sequence';
    } else if (trimmedCode.includes('classDiagram')) {
      return 'class';
    } else if (trimmedCode.includes('erDiagram')) {
      return 'er';
    } else if (trimmedCode.includes('gitgraph')) {
      return 'gitgraph';
    } else if (trimmedCode.includes('gantt')) {
      return 'gantt';
    } else if (trimmedCode.includes('pie')) {
      return 'pie';
    } else if (trimmedCode.includes('journey')) {
      return 'journey';
    } else if (trimmedCode.includes('graph') || trimmedCode.includes('flowchart')) {
      return 'flowchart';
    }
    
    // 默认返回 flowchart
    return 'flowchart';
  }

  /**
   * 验证 Mermaid 代码是否包含保留关键字和其他问题
   */
  private validateMermaidCode(code: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    const reservedKeywords = [
      'end', 'start', 'stop', 'class', 'state', 'note', 'loop', 'alt', 'opt', 
      'par', 'critical', 'break', 'rect', 'activate', 'deactivate', 'if', 
      'else', 'elseif', 'endif', 'and', 'or', 'not', 'true', 'false'
    ];
    
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // 跳过空行、注释和图表类型声明
      if (!trimmedLine || 
          trimmedLine.startsWith('%%') || 
          trimmedLine.startsWith('flowchart') ||
          trimmedLine.startsWith('graph') ||
          trimmedLine.startsWith('sequenceDiagram') ||
          trimmedLine.startsWith('classDiagram')) {
        return;
      }
      
      // 检查是否包含保留关键字作为节点ID
      reservedKeywords.forEach(keyword => {
        const patterns = [
          new RegExp(`^\\s*${keyword}(?=\\[|\\(|\\s*-->|\\s*---|\s*==>)`, 'i'),
          new RegExp(`(-->|---|==>)\\s+${keyword}(?=\\[|\\(|\\s*$)`, 'i'),
          new RegExp(`^\\s*${keyword}\\s*$`, 'i')
        ];
        
        patterns.forEach(pattern => {
          if (pattern.test(trimmedLine)) {
            issues.push(`第${index + 1}行包含保留关键字 "${keyword}": ${trimmedLine}`);
          }
        });
      });
      
      // 检查中文标签中的问题字符
      const labelMatches = trimmedLine.match(/\[([^\]]*)\]/g);
      if (labelMatches) {
        labelMatches.forEach(label => {
          const content = label.slice(1, -1); // 移除方括号
          
          // 检查是否包含换行符
          if (content.includes('\\n') || content.includes('\n')) {
            issues.push(`第${index + 1}行标签包含换行符，可能导致解析错误: ${label}`);
          }
          
          // 检查是否包含中文特殊符号
          if (/[（）、，。！？；：""''【】《》]/.test(content)) {
            issues.push(`第${index + 1}行标签包含中文特殊符号，建议使用英文符号: ${label}`);
          }
          
          // 检查标签长度
          if (content.length > 30) {
            issues.push(`第${index + 1}行标签过长，建议简化: ${label}`);
          }
        });
      }
      
      // 检查箭头格式
      if (trimmedLine.includes('-->') || trimmedLine.includes('---') || trimmedLine.includes('==>')) {
        // 检查箭头前后是否有空格
        if (/\w-->/g.test(trimmedLine) || /-->\w/g.test(trimmedLine)) {
          issues.push(`第${index + 1}行箭头格式不正确，缺少空格: ${trimmedLine}`);
        }
      }
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * 测试 Mermaid 代码的有效性
   */
  public testMermaidCode(code: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 基本验证
    const validation = this.validateMermaidCode(code);
    errors.push(...validation.issues);
    
    // 检查基本语法结构
    const lines = code.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      errors.push('代码为空');
      return { isValid: false, errors, warnings };
    }
    
    // 检查是否有图表类型声明
    const hasGraphType = lines.some(line => 
      /^(flowchart|graph|sequenceDiagram|classDiagram|erDiagram|gitgraph|gantt|pie|journey)/i.test(line.trim())
    );
    
    if (!hasGraphType) {
      warnings.push('缺少图表类型声明，建议添加 flowchart TD 或其他图表类型');
    }
    
    // 检查是否有节点定义
    const hasNodes = lines.some(line => 
      /\w+\s*(\[|\(|\{)/.test(line) || /-->/g.test(line)
    );
    
    if (!hasNodes) {
      errors.push('未找到有效的节点定义或连接');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 构建最终结果
   */
  private buildResult(validated: any, request: DiagramGenerationRequest): DiagramGenerationResult {
    // 清理 mermaidCode，移除代码块标记
    let cleanedMermaidCode = validated.mermaidCode;
    
    // 移除可能的代码块标记
    cleanedMermaidCode = cleanedMermaidCode
      .replace(/^```mermaid\s*\n?/i, '')  // 移除开头的 ```mermaid
      .replace(/^```\s*\n?/i, '')        // 移除开头的 ```
      .replace(/\n?```\s*$/i, '')        // 移除结尾的 ```
      .trim();                           // 移除前后空白

    // 应用预处理，修复保留关键字和语法问题
    cleanedMermaidCode = this.preprocessMermaidCode(cleanedMermaidCode);

    // 验证最终代码
    const validation = this.validateMermaidCode(cleanedMermaidCode);
    if (!validation.isValid) {
      console.warn('DiagramAgent: 代码验证发现问题:', validation.issues);
      // 如果仍有问题，再次尝试预处理
      cleanedMermaidCode = this.preprocessMermaidCode(cleanedMermaidCode);
    }

    console.log('DiagramAgent: 原始代码:', validated.mermaidCode);
    console.log('DiagramAgent: 最终处理后代码:', cleanedMermaidCode);

    return {
      mermaidCode: cleanedMermaidCode,
      explanation: validated.explanation,
      suggestions: validated.suggestions,
      diagramType: validated.diagramType,
      metadata: {
        model: this.model._llmType(),
        provider: this.getProviderName(),
        usage: this.extractUsageInfo()
      }
    };
  }

  /**
   * 获取提供商名称
   */
  private getProviderName(): string {
    const modelType = this.model._llmType();
    if (modelType === 'volcengine') return 'volcengine';
    if (modelType === 'openai') return 'openai';
    if (modelType === 'anthropic') return 'anthropic';
    if (modelType === 'qwen') return 'qwen';
    return 'unknown';
  }

  /**
   * 提取使用信息
   */
  private extractUsageInfo(): { totalTokens?: number; promptTokens?: number; completionTokens?: number } | undefined {
    // 这里可以根据不同提供商的响应格式提取token使用信息
    return undefined;
  }

  /**
   * 更新对话历史
   */
  private updateConversationHistory(userPrompt: string, response: string): void {
    // 直接添加用户消息和AI回复
    this.conversationHistory.push(
      new HumanMessage(userPrompt),
      new AIMessage(response)
    );

    console.log('DiagramAgent: 添加对话记录 - 用户:', userPrompt.substring(0, 50) + '...');
    console.log('DiagramAgent: 添加对话记录 - 助手:', response.substring(0, 50) + '...');

    // 限制历史长度，保持最近的对话
    const maxHistoryLength = 20; // 增加历史长度以支持更长的对话
    if (this.conversationHistory.length > maxHistoryLength + 1) { // +1 for system message
      const systemMessages = this.conversationHistory.filter(msg => msg._getType() === 'system');
      const recentMessages = this.conversationHistory
        .filter(msg => msg._getType() !== 'system')
        .slice(-maxHistoryLength);
      
      this.conversationHistory = [...systemMessages, ...recentMessages];
      console.log('DiagramAgent: 对话历史已截断，保留最近', maxHistoryLength, '条消息');
    }
  }

  /**
   * 调试助手：验证生成的代码
   */
  public debugGeneratedCode(code: string): {
    isValid: boolean;
    errors: string[];
    suggestions: string[];
    fixedCode?: string;
  } {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // 检查基本结构
    if (!code.trim()) {
      errors.push('代码为空');
      return { isValid: false, errors, suggestions };
    }
    
    // 检查图表类型声明
    const hasGraphDeclaration = /^(flowchart|graph|sequenceDiagram|classDiagram)/m.test(code);
    if (!hasGraphDeclaration) {
      errors.push('缺少图表类型声明');
      suggestions.push('添加 flowchart TD 或其他图表类型');
    }
    
    // 检查保留关键字
    const reservedKeywords = ['end', 'start', 'class', 'state'];
    const foundKeywords: string[] = [];
    
    code.split('\n').forEach((line, index) => {
      reservedKeywords.forEach(keyword => {
        if (new RegExp(`\\b${keyword}\\b(?=\\s*[\\[\\(]|\\s*-->)`, 'i').test(line)) {
          foundKeywords.push(keyword);
          errors.push(`第${index + 1}行使用了保留关键字: ${keyword}`);
        }
      });
    });
    
    // 提供修复建议
    if (foundKeywords.length > 0) {
      suggestions.push('将保留关键字替换为: ' + foundKeywords.map(k => `${k} -> ${k}Node`).join(', '));
    }
    
    // 尝试自动修复
    let fixedCode = code;
    if (errors.length > 0) {
      fixedCode = this.preprocessMermaidCodeSafely(code);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
      fixedCode: fixedCode !== code ? fixedCode : undefined
    };
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 静态工具方法
 */
export class DiagramAgentUtils {
  /**
   * 快速验证 Mermaid 代码
   */
  static validateMermaidCode(code: string): { isValid: boolean; issues: string[] } {
    const agent = new DiagramAgent({
      model: new ChatOpenAI({ openAIApiKey: 'dummy' }) // 仅用于验证，不会实际调用
    });
    
    return (agent as any).validateMermaidCode(code);
  }

  /**
   * 快速测试 Mermaid 代码
   */
  static testMermaidCode(code: string): { isValid: boolean; errors: string[]; warnings: string[] } {
    const agent = new DiagramAgent({
      model: new ChatOpenAI({ openAIApiKey: 'dummy' }) // 仅用于验证，不会实际调用
    });
    
    return agent.testMermaidCode(code);
  }

  /**
   * 预处理 Mermaid 代码
   */
  static preprocessMermaidCode(code: string): string {
    const agent = new DiagramAgent({
      model: new ChatOpenAI({ openAIApiKey: 'dummy' }) // 仅用于验证，不会实际调用
    });
    
    return (agent as any).preprocessMermaidCode(code);
  }

  /**
   * 修复中文标签
   */
  static fixChineseLabels(line: string): string {
    const agent = new DiagramAgent({
      model: new ChatOpenAI({ openAIApiKey: 'dummy' }) // 仅用于验证，不会实际调用
    });
    
    return (agent as any).fixChineseLabels(line);
  }

  /**
   * 检测图表类型
   */
  static detectDiagramType(code: string): string {
    const agent = new DiagramAgent({
      model: new ChatOpenAI({ openAIApiKey: 'dummy' }) // 仅用于验证，不会实际调用
    });
    
    return (agent as any).detectDiagramType(code);
  }

  /**
   * 批量修复 Mermaid 代码中的常见问题
   */
  static batchFixMermaidCode(codes: string[]): string[] {
    return codes.map(code => this.preprocessMermaidCode(code));
  }

  /**
   * 获取保留关键字列表
   */
  static getReservedKeywords(): string[] {
    return [
      'end', 'start', 'stop', 'class', 'state', 'note', 'loop', 'alt', 'opt', 
      'par', 'critical', 'break', 'rect', 'activate', 'deactivate', 'if', 
      'else', 'elseif', 'endif', 'and', 'or', 'not', 'true', 'false'
    ];
  }

  /**
   * 检查代码是否包含保留关键字
   */
  static hasReservedKeywords(code: string): { hasIssues: boolean; keywords: string[] } {
    const reservedKeywords = this.getReservedKeywords();
    const foundKeywords: string[] = [];
    
    const lines = code.split('\n');
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 跳过空行、注释和图表类型声明
      if (!trimmedLine || 
          trimmedLine.startsWith('%%') || 
          trimmedLine.startsWith('flowchart') ||
          trimmedLine.startsWith('graph') ||
          trimmedLine.startsWith('sequenceDiagram') ||
          trimmedLine.startsWith('classDiagram')) {
        return;
      }
      
      reservedKeywords.forEach(keyword => {
        const patterns = [
          new RegExp(`^\\s*${keyword}(?=\\[|\\(|\\s*-->|\\s*---|\s*==>)`, 'i'),
          new RegExp(`(-->|---|==>)\\s+${keyword}(?=\\[|\\(|\\s*$)`, 'i'),
          new RegExp(`^\\s*${keyword}\\s*$`, 'i')
        ];
        
        patterns.forEach(pattern => {
          if (pattern.test(trimmedLine) && !foundKeywords.includes(keyword)) {
            foundKeywords.push(keyword);
          }
        });
      });
    });
    
    return {
      hasIssues: foundKeywords.length > 0,
      keywords: foundKeywords
    };
  }
}

/**
 * Agent 工厂类
 */
export class DiagramAgentFactory {
  /**
   * 创建火山引擎 Agent
   */
  static createVolcengineAgent(config: {
    apiKey: string;
    endpoint?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    enableMemory?: boolean;
  }): DiagramAgent {
    const model = new VolcengineLangChainProvider({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });

    return new DiagramAgent({
      model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enableMemory: config.enableMemory || false,
      retryCount: 3
    });
  }

  /**
   * 创建 OpenAI Agent
   */
  static createOpenAIAgent(config: {
    apiKey: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    enableMemory?: boolean;
  }): DiagramAgent {
    const model = new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.modelName || 'gpt-4',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048
    });

    return new DiagramAgent({
      model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enableMemory: config.enableMemory || false,
      retryCount: 3
    });
  }

  /**
   * 创建 Claude Agent
   */
  static createClaudeAgent(config: {
    apiKey: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    enableMemory?: boolean;
  }): DiagramAgent {
    const model = new ChatAnthropic({
      anthropicApiKey: config.apiKey,
      modelName: config.modelName || 'claude-3-sonnet-20240229',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 2048
    });

    return new DiagramAgent({
      model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enableMemory: config.enableMemory || false,
      retryCount: 3
    });
  }

  /**
   * 创建 Qwen Agent
   */
  static createQwenAgent(config: {
    apiKey: string;
    endpoint?: string;
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    enableMemory?: boolean;
  }): DiagramAgent {
    const model = new QwenLangChainProvider({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    });

    return new DiagramAgent({
      model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enableMemory: config.enableMemory || false,
      retryCount: 3
    });
  }
}
