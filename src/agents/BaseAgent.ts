/**
 * AI Agent 基类
 * 提供通用的 AI 交互能力，可在不同场景中复用
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  name: string;
  call(messages: AIMessage[], options?: any): Promise<string>;
}

export interface AgentConfig {
  provider: AIProvider;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  retryCount?: number;
  timeout?: number;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected conversationHistory: AIMessage[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
    
    // 如果有系统提示，添加到对话历史
    if (config.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: config.systemPrompt
      });
    }
  }

  /**
   * 执行 AI 调用
   */
  async execute(input: string, options?: any): Promise<string> {
    const messages = [...this.conversationHistory];
    
    // 添加用户输入
    messages.push({
      role: 'user',
      content: input
    });

    // 预处理输入（子类可重写）
    const processedMessages = await this.preprocessMessages(messages, options);
    
    try {
      const response = await this.callAI(processedMessages, options);
      
      // 后处理响应（子类可重写）
      const processedResponse = await this.postprocessResponse(response, options);
      
      // 更新对话历史
      this.updateConversationHistory(input, processedResponse);
      
      return processedResponse;
    } catch (error) {
      throw new Error(`AI Agent 调用失败: ${error.message}`);
    }
  }

  /**
   * 批量处理多个请求
   */
  async batchExecute(inputs: string[], options?: any): Promise<string[]> {
    const results = await Promise.all(
      inputs.map(input => this.execute(input, options))
    );
    return results;
  }

  /**
   * 清空对话历史
   */
  clearHistory(): void {
    this.conversationHistory = [];
    if (this.config.systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: this.config.systemPrompt
      });
    }
  }

  /**
   * 获取对话历史
   */
  getHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * 预处理消息（子类可重写）
   */
  protected async preprocessMessages(messages: AIMessage[], options?: any): Promise<AIMessage[]> {
    return messages;
  }

  /**
   * 后处理响应（子类可重写）
   */
  protected async postprocessResponse(response: string, options?: any): Promise<string> {
    return response;
  }

  /**
   * 调用 AI 提供商
   */
  private async callAI(messages: AIMessage[], options?: any): Promise<string> {
    const retryCount = this.config.retryCount || 3;
    
    for (let i = 0; i < retryCount; i++) {
      try {
        return await this.config.provider.call(messages, {
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          timeout: this.config.timeout,
          ...options
        });
      } catch (error) {
        if (i === retryCount - 1) {
          throw error;
        }
        
        // 重试前等待
        await this.sleep(1000 * (i + 1));
      }
    }
    
    throw new Error('AI 调用失败');
  }

  /**
   * 更新对话历史
   */
  private updateConversationHistory(input: string, response: string): void {
    this.conversationHistory.push(
      { role: 'user', content: input },
      { role: 'assistant', content: response }
    );
    
    // 限制历史长度，避免 token 过多
    const maxHistoryLength = 20;
    if (this.conversationHistory.length > maxHistoryLength) {
      // 保留系统消息，删除最旧的对话
      const systemMessages = this.conversationHistory.filter(msg => msg.role === 'system');
      const recentMessages = this.conversationHistory
        .filter(msg => msg.role !== 'system')
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