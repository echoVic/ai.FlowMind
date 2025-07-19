/**
 * Web应用专用的AgentManager
 * 提供环境变量支持和默认Agent初始化的简化接口
 */
import {
  DiagramAgent,
  DiagramAgentFactory,
  type DiagramGenerationRequest,
  type DiagramGenerationResult,
  type AIModelConfig
} from '@flowmind/diagram-core/src/agents/DiagramAgent';

export interface WebAgentConfig {
  apiKey: string;
  provider: 'volcengine' | 'openai' | 'anthropic' | 'qwen';
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  enableMemory?: boolean;
}

/**
 * Web应用专用的AgentManager
 * 提供环境变量支持和默认Agent初始化的简化接口
 */
export class WebAgentManager {
  private agents: Map<string, DiagramAgent> = new Map();
  private defaultAgentId: string | null = null;
  private agentConfigs: Map<string, AIModelConfig> = new Map();

  constructor() {
    this.initializeDefaultAgent();
  }

  /**
   * 生成图表
   */
  async generateDiagram(request: DiagramGenerationRequest, agentId?: string): Promise<DiagramGenerationResult> {
    // 如果没有指定agentId，尝试使用默认Agent或动态创建
    let targetAgentId = agentId || this.defaultAgentId;

    if (!targetAgentId) {
      // 如果没有默认Agent，尝试动态创建一个
      const tempId = `temp-${Date.now()}`;
      this.registerAgent(tempId, {
        apiKey: request.modelConfig.apiKey,
        provider: request.modelConfig.provider,
        modelName: request.modelConfig.model,
        temperature: request.modelConfig.temperature,
        maxTokens: request.modelConfig.maxTokens
      });
      targetAgentId = tempId;
    }

    const agent = this.agents.get(targetAgentId);
    if (!agent) {
      throw new Error(`Agent not found: ${targetAgentId}`);
    }

    return agent.generateDiagram(request);
  }

  /**
   * 优化图表
   */
  async optimizeDiagram(request: DiagramGenerationRequest & { existingCode?: string }, agentId?: string): Promise<DiagramGenerationResult> {
    // 如果没有指定agentId，尝试使用默认Agent或动态创建
    let targetAgentId = agentId || this.defaultAgentId;

    if (!targetAgentId) {
      // 如果没有默认Agent，尝试动态创建一个
      const tempId = `temp-${Date.now()}`;
      this.registerAgent(tempId, {
        apiKey: request.modelConfig.apiKey,
        provider: request.modelConfig.provider,
        modelName: request.modelConfig.model,
        temperature: request.modelConfig.temperature,
        maxTokens: request.modelConfig.maxTokens
      });
      targetAgentId = tempId;
    }

    const agent = this.agents.get(targetAgentId);
    if (!agent) {
      throw new Error(`Agent not found: ${targetAgentId}`);
    }

    // 使用optimizeDiagram方法，传入现有代码和优化要求
    const existingCode = request.existingCode || '';
    return agent.optimizeDiagram(existingCode, request.prompt);
  }

  /**
   * 注册新的Agent
   */
  registerAgent(id: string, config: WebAgentConfig): void {
    const aiModelConfig: AIModelConfig = {
      provider: config.provider,
      model: config.modelName || this.getDefaultModel(config.provider),
      apiKey: config.apiKey,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
    };

    // 创建DiagramAgent实例
    const agent = DiagramAgentFactory.create(aiModelConfig);

    // 存储配置和Agent
    this.agentConfigs.set(id, aiModelConfig);
    this.agents.set(id, agent);

    console.log(`Agent registered: ${id} (${config.provider})`);
  }

  /**
   * 获取Agent配置
   */
  private getAgentConfig(id: string): AIModelConfig | undefined {
    return this.agentConfigs.get(id);
  }

  /**
   * 获取默认模型名称
   */
  private getDefaultModel(provider: string): string {
    switch (provider) {
      case 'volcengine':
        return 'ep-20250617131345-rshkp';
      case 'openai':
        return 'gpt-4';
      case 'anthropic':
        return 'claude-3-sonnet-20240229';
      default:
        return 'gpt-4';
    }
  }

  /**
   * 获取所有已注册的Agent
   */
  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * 移除Agent
   */
  removeAgent(id: string): boolean {
    // 从配置映射中移除
    this.agentConfigs.delete(id);

    // 从Agent映射中移除
    const removed = this.agents.delete(id);

    // 如果是默认Agent，清除默认设置
    if (this.defaultAgentId === id) {
      this.defaultAgentId = null;
    }

    return removed;
  }

  /**
   * 设置默认Agent
   */
  setDefaultAgent(id: string): void {
    if (this.agents.has(id)) {
      this.defaultAgentId = id;
      console.log(`Default agent set to: ${id}`);
    } else {
      throw new Error(`Agent not found: ${id}`);
    }
  }

  /**
   * 获取默认Agent ID
   */
  getDefaultAgentId(): string | null {
    return this.defaultAgentId;
  }

  /**
   * 初始化默认Agent
   * 从环境变量读取配置并自动注册默认Agent
   */
  private initializeDefaultAgent(): void {
    // 从环境变量获取配置
    const arkApiKey = process.env.NEXT_PUBLIC_ARK_API_KEY;
    const arkModelName = process.env.NEXT_PUBLIC_ARK_MODEL_NAME || 'ep-20250617131345-rshkp';
    
    const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const openaiModelName = process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || 'gpt-4';
    
    const anthropicApiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    const anthropicModelName = process.env.NEXT_PUBLIC_ANTHROPIC_MODEL_NAME || 'claude-3-sonnet-20240229';
    
    const defaultTemperature = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7');
    const defaultMaxTokens = parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048');

    console.log('WebAgentManager: 初始化默认 Agent');
    console.log('- NEXT_PUBLIC_ARK_API_KEY:', arkApiKey ? '已配置' : '未配置');
    console.log('- NEXT_PUBLIC_OPENAI_API_KEY:', openaiApiKey ? '已配置' : '未配置');
    console.log('- NEXT_PUBLIC_ANTHROPIC_API_KEY:', anthropicApiKey ? '已配置' : '未配置');

    // 优先级：火山引擎 > OpenAI > Claude
    if (arkApiKey) {
      console.log('使用火山引擎作为默认 Agent');
      this.registerAgent('volcengine-default', {
        apiKey: arkApiKey,
        provider: 'volcengine',
        modelName: arkModelName,
        temperature: defaultTemperature,
        maxTokens: defaultMaxTokens,
        enableMemory: false
      });
      this.setDefaultAgent('volcengine-default');
    } else if (openaiApiKey) {
      console.log('使用 OpenAI 作为默认 Agent');
      this.registerAgent('openai-default', {
        apiKey: openaiApiKey,
        provider: 'openai',
        modelName: openaiModelName,
        temperature: defaultTemperature,
        maxTokens: defaultMaxTokens,
        enableMemory: false
      });
      this.setDefaultAgent('openai-default');
    } else if (anthropicApiKey) {
      console.log('使用 Claude 作为默认 Agent');
      this.registerAgent('anthropic-default', {
        apiKey: anthropicApiKey,
        provider: 'anthropic',
        modelName: anthropicModelName,
        temperature: defaultTemperature,
        maxTokens: defaultMaxTokens,
        enableMemory: false
      });
      this.setDefaultAgent('anthropic-default');
    } else {
      console.warn('WebAgentManager: 未找到任何 API 密钥配置');
      console.warn('请在 .env.local 文件中配置 NEXT_PUBLIC_ARK_API_KEY、NEXT_PUBLIC_OPENAI_API_KEY 或 NEXT_PUBLIC_ANTHROPIC_API_KEY');
      console.warn('或者通过前端界面手动配置 Agent');
    }
  }

  /**
   * 测试Agent连接
   */
  async testAgent(id: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const agent = this.agents.get(id);
      if (!agent) {
        return {
          success: false,
          message: `Agent not found: ${id}`
        };
      }

      const config = this.getAgentConfig(id);
      const testRequest: DiagramGenerationRequest = {
        prompt: '创建一个简单的登录流程图',
        diagramType: 'flowchart',
        modelConfig: config!
      };

      const startTime = Date.now();
      const result = await agent.generateDiagram(testRequest);
      const duration = Date.now() - startTime;

      return {
        success: result.success,
        message: result.success ? 'Agent 测试成功' : `Agent 测试失败: ${result.error}`,
        details: {
          duration,
          responseLength: result.data?.mermaidCode?.length || 0,
          provider: config?.provider,
          model: config?.model
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Agent 测试失败: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// 全局WebAgentManager实例
export const webAgentManager = new WebAgentManager();

// 默认导出
export default WebAgentManager;
