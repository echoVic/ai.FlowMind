/**
 * 基于 LangChain 的图表生成 Agent
 * 利用 LangChain 的能力实现可复用的 AI 图表生成
 */
import { ChatAnthropic } from "@langchain/anthropic";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseChatModel, BaseChatModelCallOptions } from "@langchain/core/language_models/chat_models";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatResult } from "@langchain/core/outputs";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// 图表生成请求接口
export interface DiagramGenerationRequest {
  description: string;
  diagramType?: 'flowchart' | 'sequence' | 'class' | 'er' | 'gitgraph' | 'gantt' | 'pie' | 'journey';
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
    } catch (error) {
      throw new Error(`Qwen provider error: ${error.message}`);
    }
  }

  _llmType(): string {
    return 'qwen';
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
    this.endpoint = config.endpoint || 'https://ark.cn-beijing.volces.com/api/v3';
    this.modelName = config.modelName || 'ep-20250617131345-rshkp';
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 2048;
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
        throw new Error(`Volcengine API error: ${response.status}`);
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
    } catch (error) {
      throw new Error(`Volcengine provider error: ${error.message}`);
    }
  }

  _llmType(): string {
    return 'volcengine';
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
   * 生成图表
   */
  async generateDiagram(request: DiagramGenerationRequest): Promise<DiagramGenerationResult> {
    try {
      console.log('DiagramAgent: 开始生成图表');
      console.log('- 描述:', request.description);
      console.log('- 图表类型:', request.diagramType);
      console.log('- 现有代码:', request.existingCode ? '存在' : '不存在');

      // 构建提示消息
      const userPrompt = this.buildGenerationPrompt(request);
      const messages = this.buildMessages(userPrompt);

      // 调用 AI 模型
      const response = await this.invokeModel(messages);
      
      // 解析响应
      const result = this.parseResponse(response, request);
      
      // 更新对话历史
      if (this.config.enableMemory) {
        this.updateConversationHistory(userPrompt, response);
      }

      console.log('DiagramAgent: 图表生成完成');
      return result;

    } catch (error) {
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
   * 初始化系统提示
   */
  private initializeSystemPrompt(): void {
    const systemPrompt = `你是一个专业的架构图生成专家。请根据用户的描述生成高质量的Mermaid代码。

生成规则：
1. 严格按照Mermaid语法规范生成代码
2. 根据描述选择最合适的图表类型
3. 节点命名要清晰、有意义
4. 连接关系要符合逻辑
5. 代码结构要清晰易读

支持的图表类型：
- flowchart: 流程图 (推荐用于业务流程、系统架构)
- sequence: 时序图 (推荐用于交互流程、API调用)
- class: 类图 (推荐用于系统设计、数据结构)
- er: 实体关系图 (推荐用于数据库设计)
- gitgraph: Git分支图 (推荐用于版本管理流程)
- gantt: 甘特图 (推荐用于项目计划、时间安排)
- pie: 饼图 (推荐用于数据统计、比例展示)
- journey: 用户旅程图 (推荐用于用户体验设计)

请严格按照以下JSON格式返回：
{
  "mermaidCode": "这里是生成的mermaid代码",
  "explanation": "简要说明代码的功能和结构",
  "suggestions": ["优化建议1", "优化建议2"],
  "diagramType": "图表类型"
}`;

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
  private buildMessages(userPrompt: string): BaseMessage[] {
    const messages = [...this.conversationHistory];
    messages.push(new HumanMessage(userPrompt));
    return messages;
  }

  /**
   * 调用 AI 模型
   */
  private async invokeModel(messages: BaseMessage[]): Promise<string> {
    const retryCount = this.config.retryCount || 3;
    
    for (let i = 0; i < retryCount; i++) {
      try {
        const response = await this.model.invoke(messages);
        return response.content as string;
      } catch (error) {
        if (i === retryCount - 1) {
          throw error;
        }
        
        console.warn(`DiagramAgent: 调用失败，重试 ${i + 1}/${retryCount}`, error.message);
        await this.sleep(1000 * (i + 1));
      }
    }
    
    throw new Error('AI 模型调用失败');
  }

  /**
   * 解析响应
   */
  private parseResponse(response: string, request: DiagramGenerationRequest): DiagramGenerationResult {
    try {
      console.log('DiagramAgent: 开始解析响应');
      console.log('DiagramAgent: 原始响应:', response.substring(0, 200) + '...');
      
      // 尝试解析JSON响应
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法找到JSON响应');
      }

      let jsonString = jsonMatch[0];
      console.log('DiagramAgent: 提取的JSON字符串:', jsonString.substring(0, 100) + '...');

      // 修复JSON中的控制字符问题
      try {
        // 直接解析，如果失败则进行修复
        const parsed = JSON.parse(jsonString);
        const validated = this.validateAndCleanResponse(parsed);
        return this.buildResult(validated, request);
      } catch (parseError) {
        console.log('DiagramAgent: JSON解析失败，尝试修复:', parseError.message);
        
        // 尝试修复JSON字符串
        const fixedJsonString = this.fixJsonString(jsonString);
        console.log('DiagramAgent: 修复后的JSON:', fixedJsonString.substring(0, 100) + '...');
        
        const parsed = JSON.parse(fixedJsonString);
        const validated = this.validateAndCleanResponse(parsed);
        return this.buildResult(validated, request);
      }

    } catch (error) {
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
      
      // 方法3：最后的兜底方案 - 尝试重新构建JSON
      try {
        // 提取字段值（使用更宽松的匹配）
        const mermaidCodeMatch = jsonString.match(/"mermaidCode"\s*:\s*"([\s\S]*?)(?=",\s*"explanation"|"})/);
        const explanationMatch = jsonString.match(/"explanation"\s*:\s*"([^"]*(?:\\.[^"]*)*)"(?=\s*,|\s*})/);
        const suggestionsMatch = jsonString.match(/"suggestions"\s*:\s*\[([\s\S]*?)\](?=\s*,|\s*})/);
        const diagramTypeMatch = jsonString.match(/"diagramType"\s*:\s*"([^"]*)"(?=\s*,|\s*})/);
        
        if (mermaidCodeMatch && explanationMatch && diagramTypeMatch) {
          // 重新构建JSON
          const cleanedJson = {
            mermaidCode: mermaidCodeMatch[1],
            explanation: explanationMatch[1],
            suggestions: suggestionsMatch ? JSON.parse(`[${suggestionsMatch[1]}]`) : [],
            diagramType: diagramTypeMatch[1]
          };
          
          return JSON.stringify(cleanedJson);
        }
      } catch (error3) {
        console.log('DiagramAgent: 重构JSON也失败');
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

    console.log('DiagramAgent: 原始代码:', validated.mermaidCode);
    console.log('DiagramAgent: 清理后代码:', cleanedMermaidCode);

    return {
      mermaidCode: cleanedMermaidCode,
      explanation: validated.explanation,
      suggestions: validated.suggestions,
      diagramType: validated.diagramType,
      metadata: {
        model: this.model._llmType(),
        provider: this.getProviderName(),
        usage: this.extractUsageInfo('')
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
  private extractUsageInfo(response: string): { totalTokens?: number; promptTokens?: number; completionTokens?: number } | undefined {
    // 这里可以根据不同提供商的响应格式提取token使用信息
    return undefined;
  }

  /**
   * 更新对话历史
   */
  private updateConversationHistory(userPrompt: string, response: string): void {
    this.conversationHistory.push(
      new HumanMessage(userPrompt),
      new AIMessage(response)
    );

    // 限制历史长度
    const maxHistoryLength = 10;
    if (this.conversationHistory.length > maxHistoryLength) {
      const systemMessages = this.conversationHistory.filter(msg => msg._getType() === 'system');
      const recentMessages = this.conversationHistory
        .filter(msg => msg._getType() !== 'system')
        .slice(-maxHistoryLength);
      
      this.conversationHistory = [...systemMessages, ...recentMessages];
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