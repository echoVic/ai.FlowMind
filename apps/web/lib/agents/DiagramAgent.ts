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
export interface DiagramAgentConfig {
  model: BaseChatModel;
  temperature?: number;
  maxTokens?: number;
  retryCount?: number;
  enableMemory?: boolean;
}

// Qwen Provider 适配器
export class QwenLangChainProvider extends BaseChatModel {
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
export class VolcengineLangChainProvider extends BaseChatModel {
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
    this.initializeSystemPrompt();
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
      const messages = this.buildMessages(userPrompt);

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
    const request: DiagramGenerationRequest = {
      description: requirements,
      existingCode: mermaidCode,
      optimizationRequirements: requirements
    };

    return this.generateDiagram(request);
  }

  /**
   * 批量生成图表
   */
  async batchGenerateDiagrams(requests: DiagramGenerationRequest[]): Promise<DiagramGenerationResult[]> {
    const results = await Promise.all(
      requests.map(request => this.generateDiagram(request))
    );
    return results;
  }

  /**
   * 清空对话历史
   */
  clearHistory(): void {
    this.conversationHistory = [];
    this.initializeSystemPrompt();
  }

  /**
   * 设置对话历史
   */
  setConversationHistory(history: Array<{role: string, content: string}>): void {
    this.conversationHistory = [new SystemMessage(this.getSystemPrompt())];
    
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
    return `你是一个专业的架构图生成专家。请根据用户的描述生成高质量的Mermaid代码。

🔥 关键规则 - 必须严格遵守：
1. 严格按照Mermaid语法规范生成代码
2. 根据描述选择最合适的图表类型
3. 节点命名要清晰、有意义，绝对不能使用保留关键字
4. 连接关系要符合逻辑
5. 代码结构要清晰易读

🚫 绝对禁止使用的保留关键字作为节点ID：
end, start, stop, class, state, note, loop, alt, opt, par, critical, break, rect, activate, deactivate, if, else, elseif, endif

✅ 正确的节点ID命名规范：
- 使用描述性名称：startNode, endNode, processStep, checkPoint, resultNode
- 字母开头，可包含字母、数字、下划线
- 避免单个词汇，使用组合词：loginProcess, dataValidation, userRegistration
- 中文标签放在方括号内：startNode[开始], endNode([结束])

✅ 正确的语法格式：
- 箭头前后要有空格：nodeA --> nodeB
- 每行代码结尾不要有多余空格
- 确保所有节点ID在整个图表中唯一

📝 标准模板示例：
\`\`\`
flowchart TD
    startNode([开始]) --> inputData[输入数据]
    inputData --> processData[处理数据]
    processData --> checkResult{检查结果}
    checkResult -->|成功| outputResult[输出结果]
    checkResult -->|失败| errorHandle[错误处理]
    outputResult --> endNode([结束])
    errorHandle --> endNode
\`\`\`

⚠️ 特别注意：
- 绝对不要使用 "end" 作为节点ID，必须使用 "endNode" 或 "finishNode"
- 绝对不要使用 "start" 作为节点ID，必须使用 "startNode" 或 "beginNode"
- 绝对不要使用 "class" 作为节点ID，必须使用 "classNode" 或 "classInfo"
- 绝对不要使用 "state" 作为节点ID，必须使用 "stateNode" 或 "statusNode"

支持的图表类型：
- flowchart: 流程图 (推荐用于业务流程、系统架构)
- sequence: 时序图 (推荐用于交互流程、API调用)
- class: 类图 (推荐用于系统设计、数据结构)
- state: 状态图 (推荐用于对象生命周期、协议状态机)
- er: 实体关系图 (推荐用于数据库设计)
- journey: 用户旅程图 (推荐用于用户体验设计)
- gantt: 甘特图 (推荐用于项目计划、时间安排)
- pie: 饼图 (推荐用于数据统计、比例展示)
- quadrant: 四象限图 (推荐用于战略分析、优先级排序)
- mindmap: 思维导图 (推荐用于头脑风暴、知识整理)
- gitgraph: Git分支图 (推荐用于版本管理流程)
- kanban: 看板图 (推荐用于任务管理、敏捷开发)
- architecture: 架构图 (C4风格，推荐用于复杂系统架构展示)
- packet: 数据包图 (推荐用于网络协议分析)

请严格按照以下JSON格式返回：
{\n  "mermaidCode": "这里是生成的mermaid代码",\n  "explanation": "简要说明代码的功能和结构",\n  "suggestions": ["优化建议1", "优化建议2"],\n  "diagramType": "图表类型"\n}`;
  }

  /**
   * 初始化系统提示
   */
  private initializeSystemPrompt(): void {
    this.conversationHistory = [new SystemMessage(this.getSystemPrompt())];
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
  private buildMessages(userPrompt: string): BaseMessage[] {
    // 创建临时消息数组，不修改conversationHistory
    const messages = [...this.conversationHistory];
    messages.push(new HumanMessage(userPrompt));
    return messages;
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
   * 预处理和修复 Mermaid 代码中的常见问题
   */
  private preprocessMermaidCode(code: string): string {
    console.log('DiagramAgent: 开始预处理 Mermaid 代码');
    
    // 定义保留关键字映射 - 扩展版本
    const reservedKeywords = {
      'end': 'endNode',
      'start': 'startNode', 
      'stop': 'stopNode',
      'class': 'classNode',
      'state': 'stateNode',
      'note': 'noteNode',
      'loop': 'loopNode',
      'alt': 'altNode',
      'opt': 'optNode',
      'par': 'parNode',
      'critical': 'criticalNode',
      'break': 'breakNode',
      'rect': 'rectNode',
      'activate': 'activateNode',
      'deactivate': 'deactivateNode',
      'if': 'ifNode',
      'else': 'elseNode',
      'elseif': 'elseifNode',
      'endif': 'endifNode',
      // 添加更多可能的保留关键字
      'and': 'andNode',
      'or': 'orNode',
      'not': 'notNode',
      'true': 'trueNode',
      'false': 'falseNode'
    };
    
    let processedCode = code.trim();
    let hasChanges = false;
    
    // 按行处理代码
    const lines = processedCode.split('\n');
    const processedLines = lines.map((line, index) => {
      let processedLine = line.trim();
      
      // 跳过空行、注释和图表类型声明行
      if (!processedLine || 
          processedLine.startsWith('%%') || 
          processedLine.startsWith('flowchart') ||
          processedLine.startsWith('graph') ||
          processedLine.startsWith('sequenceDiagram') ||
          processedLine.startsWith('classDiagram')) {
        return processedLine;
      }
      
      // 修复保留关键字问题 - 使用更精确的匹配
      for (const [reserved, replacement] of Object.entries(reservedKeywords)) {
        // 创建多个匹配模式
        const patterns = [
          // 1. 匹配行开头的保留关键字后跟标签或箭头
          new RegExp(`^\\s*${reserved}(?=\\[|\\(|\\s*-->|\\s*---|\s*==>)`, 'i'),
          // 2. 匹配箭头后的保留关键字
          new RegExp(`(-->|---|==>)\\s+${reserved}(?=\\[|\\(|\\s*$)`, 'i'),
          // 3. 匹配单独一行的保留关键字
          new RegExp(`^\\s*${reserved}\\s*$`, 'i'),
          // 4. 匹配保留关键字后跟标签的情况
          new RegExp(`\\b${reserved}(?=\\[|\\()`, 'i')
        ];
        
        let lineChanged = false;
        patterns.forEach(pattern => {
          if (pattern.test(processedLine)) {
            console.log(`DiagramAgent: 第${index + 1}行发现保留关键字 "${reserved}"，替换为 "${replacement}"`);
            processedLine = processedLine.replace(pattern, (match) => {
              return match.replace(new RegExp(`\\b${reserved}\\b`, 'i'), replacement);
            });
            lineChanged = true;
            hasChanges = true;
          }
        });
        
        // 如果这一行已经被修改，跳过其他关键字检查以避免重复替换
        if (lineChanged) break;
      }
      
      // 修复箭头格式 - 确保前后有空格
      const originalLine = processedLine;
      processedLine = processedLine
        // 处理 --> 箭头
        .replace(/(\w+|\]|\))-->/g, '$1 -->')
        .replace(/-->(\w+|\[)/g, '--> $1')
        // 处理 --- 箭头
        .replace(/(\w+|\]|\))---/g, '$1 ---')
        .replace(/---(\w+|\[)/g, '--- $1')
        // 处理 ==> 箭头
        .replace(/(\w+|\]|\))==>/g, '$1 ==>')
        .replace(/==>(\w+|\[)/g, '==> $1')
        // 处理条件箭头 -->|label|
        .replace(/-->\|([^|]+)\|(\w+)/g, '--> |$1| $2')
        .replace(/(\w+)\|([^|]+)\|-->/g, '$1 |$2| -->');
      
      if (originalLine !== processedLine) {
        hasChanges = true;
      }
      
      return processedLine;
    });
    
    processedCode = processedLines.join('\n');
    
    // 最终清理
    const finalCode = processedCode
      // 移除多余的空行（超过2个连续空行）
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // 确保代码结尾有且仅有一个换行符
      .replace(/\n*$/, '\n')
      // 移除行尾空格
      .replace(/[ \t]+$/gm, '');
    
    if (hasChanges || finalCode !== code.trim() + '\n') {
      console.log('DiagramAgent: 代码已预处理，修复了保留关键字和语法问题');
      console.log('DiagramAgent: 修复前:', code.substring(0, 150) + '...');
      console.log('DiagramAgent: 修复后:', finalCode.substring(0, 150) + '...');
    }
    
    return finalCode;
  }

  /**
   * 解析响应
   */
  private parseResponse(response: string, request: DiagramGenerationRequest): DiagramGenerationResult {
    try {
      console.log('DiagramAgent: 开始解析响应');
      console.log('DiagramAgent: 原始响应:', response.substring(0, 200) + '...');
      
      // 首先尝试解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          let jsonString = jsonMatch[0];
          console.log('DiagramAgent: 提取的JSON字符串:', jsonString.substring(0, 100) + '...');

          // 修复JSON中的控制字符问题
          try {
            // 直接解析，如果失败则进行修复
            const parsed = JSON.parse(jsonString);
            const validated = this.validateAndCleanResponse(parsed);
            return this.buildResult(validated, request);
          } catch (parseError) {
            console.log('DiagramAgent: JSON解析失败，尝试修复:', (parseError as Error).message);
            
            // 尝试修复JSON字符串
            const fixedJsonString = this.fixJsonString(jsonString);
            console.log('DiagramAgent: 修复后的JSON:', fixedJsonString.substring(0, 100) + '...');
            
            const parsed = JSON.parse(fixedJsonString);
            const validated = this.validateAndCleanResponse(parsed);
            return this.buildResult(validated, request);
          }
        } catch (jsonError) {
          console.log('DiagramAgent: JSON解析彻底失败，尝试解析为纯Mermaid代码');
        }
      }

      // 如果JSON解析失败，尝试解析为纯Mermaid代码
      const mermaidMatch = response.match(/```mermaid\n([\s\S]*?)\n```/);
      if (mermaidMatch) {
        let mermaidCode = mermaidMatch[1];
        console.log('DiagramAgent: 找到Mermaid代码块:', mermaidCode.substring(0, 100) + '...');
        
        // 应用预处理，修复保留关键字和语法问题
        mermaidCode = this.preprocessMermaidCode(mermaidCode);
        
        // 自动检测图表类型
        const detectedType = this.detectDiagramType(mermaidCode);
        
        return {
          mermaidCode: mermaidCode,
          explanation: '已生成Mermaid图表代码',
          suggestions: ['可以进一步优化图表结构', '添加更多详细信息', '调整图表样式'],
          diagramType: detectedType || request.diagramType || 'flowchart',
          metadata: {
            model: this.model._llmType(),
            provider: this.getProviderName()
          }
        };
      }

      // 如果都没有找到，检查是否是纯Mermaid代码
      if (response.includes('graph') || response.includes('flowchart') || response.includes('sequenceDiagram')) {
        console.log('DiagramAgent: 检测到纯Mermaid代码');
        
        // 应用预处理，修复保留关键字和语法问题
        let processedCode = this.preprocessMermaidCode(response.trim());
        const detectedType = this.detectDiagramType(processedCode);
        
        return {
          mermaidCode: processedCode,
          explanation: '已生成Mermaid图表代码',
          suggestions: ['可以进一步优化图表结构', '添加更多详细信息', '调整图表样式'],
          diagramType: detectedType || request.diagramType || 'flowchart',
          metadata: {
            model: this.model._llmType(),
            provider: this.getProviderName()
          }
        };
      }

      throw new Error('无法识别响应格式');

    } catch (error: any) {
      console.error('DiagramAgent: 响应解析失败', error);
      
      // 提供默认响应
      return {
        mermaidCode: 'graph TD\n    A[解析失败] --> B[请检查输入]',
        explanation: '响应解析失败，请重试',
        suggestions: ['检查网络连接', '重新描述需求', '尝试更简单的描述'],
        diagramType: request.diagramType || 'flowchart',
        metadata: {
          model: this.model._llmType(),
          provider: this.getProviderName()
        }
      };
    }
  }

  /**
   * 修复JSON字符串中的控制字符
   */
  private fixJsonString(jsonString: string): string {
    try {
      // 方法1：尝试更简单的修复方法
      // 首先尝试简单地转义未转义的换行符
      let fixed = jsonString
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      
      // 测试是否能解析
      JSON.parse(fixed);
      return fixed;
    } catch (error) {
      console.log('DiagramAgent: 简单修复失败，尝试更复杂的修复');
      
      // 方法2：更彻底的修复
      try {
        // 提取mermaidCode字段的值并单独处理
        const mermaidCodeMatch = jsonString.match(/"mermaidCode"\s*:\s*"([^"]*(?:\\.[^"]*)*)"(?=\s*,|\s*})/);
        if (mermaidCodeMatch) {
          const originalValue = mermaidCodeMatch[1];
          // 正确转义Mermaid代码中的特殊字符
          const escapedValue = originalValue
            .replace(/\\/g, '\\\\')  // 转义反斜杠
            .replace(/"/g, '\\"')    // 转义双引号
            .replace(/\n/g, '\\n')   // 转义换行符
            .replace(/\r/g, '\\r')   // 转义回车符
            .replace(/\t/g, '\\t');  // 转义制表符
          
          // 替换原始值
          const fixedJson = jsonString.replace(mermaidCodeMatch[0], `"mermaidCode": "${escapedValue}"`);
          
          // 测试解析
          JSON.parse(fixedJson);
          return fixedJson;
        }
      } catch (error2) {
        console.log('DiagramAgent: 复杂修复也失败');
      }
      
      // 如果所有方法都失败，返回原始字符串
      return jsonString;
    }
  }

  /**
   * 验证和清理响应数据
   */
  private validateAndCleanResponse(parsed: any): any {
    // 验证响应格式
    const schema = z.object({
      mermaidCode: z.string(),
      explanation: z.string(),
      suggestions: z.array(z.string()),
      diagramType: z.string()
    });

    return schema.parse(parsed);
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
   * 验证 Mermaid 代码是否包含保留关键字
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
    });
    
    return {
      isValid: issues.length === 0,
      issues
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
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
