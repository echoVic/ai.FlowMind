/**
 * AI Agent 管理服务
 * 统一管理不同的 AI Agent 实例，提供简单的调用接口
 */
import { DiagramAgent, DiagramAgentFactory, DiagramGenerationRequest, DiagramGenerationResult } from '../agents/DiagramAgent';
import type { AIModelConfig } from '../shared/types';

export interface AgentConfig {
  apiKey: string;
  provider: 'volcengine' | 'openai' | 'anthropic' | 'qwen';
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  enableMemory?: boolean;
  endpoint?: string;
}

export class AgentManager {
  private agents: Map<string, DiagramAgent> = new Map();
  private defaultAgent: DiagramAgent | null = null;

  /**
   * 初始化 Agent Manager
   */
  constructor() {
    this.initializeDefaultAgent();
  }

  /**
   * 生成图表
   */
  async generateDiagram(request: DiagramGenerationRequest, agentKey?: string): Promise<DiagramGenerationResult> {
    const agent = this.getAgent(agentKey);
    if (!agent) {
      throw new Error(`Agent not found: ${agentKey || 'default'}`);
    }

    return agent.generateDiagram(request);
  }

  /**
   * 优化图表
   */
  async optimizeDiagram(mermaidCode: string, requirements: string, agentKey?: string): Promise<DiagramGenerationResult> {
    const agent = this.getAgent(agentKey);
    if (!agent) {
      throw new Error(`Agent not found: ${agentKey || 'default'}`);
    }

    return agent.optimizeDiagram(mermaidCode, requirements);
  }

  /**
   * 注册新的 Agent
   */
  registerAgent(key: string, config: AgentConfig): void {
    let agent: DiagramAgent;

    switch (config.provider) {
      case 'volcengine':
        agent = DiagramAgentFactory.createVolcengineAgent({
          apiKey: config.apiKey,
          modelName: config.modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          enableMemory: config.enableMemory
        });
        break;

      case 'openai':
        agent = DiagramAgentFactory.createOpenAIAgent({
          apiKey: config.apiKey,
          modelName: config.modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          enableMemory: config.enableMemory
        });
        break;

      case 'anthropic':
        agent = DiagramAgentFactory.createClaudeAgent({
          apiKey: config.apiKey,
          modelName: config.modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          enableMemory: config.enableMemory
        });
        break;

      case 'qwen':
        agent = DiagramAgentFactory.createQwenAgent({
          apiKey: config.apiKey,
          endpoint: config.endpoint,
          modelName: config.modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          enableMemory: config.enableMemory
        });
        break;

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    this.agents.set(key, agent);
    console.log(`Agent registered: ${key} (${config.provider})`);
  }

  /**
   * 获取 Agent
   */
  getAgent(key?: string): DiagramAgent | null {
    if (!key) {
      return this.defaultAgent;
    }
    return this.agents.get(key) || null;
  }

  /**
   * 获取所有已注册的 Agent
   */
  getAvailableAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * 移除 Agent
   */
  removeAgent(key: string): void {
    this.agents.delete(key);
  }

  /**
   * 清空所有 Agent 的对话历史
   */
  clearAllHistory(): void {
    this.agents.forEach(agent => agent.clearHistory());
    this.defaultAgent?.clearHistory();
  }

  /**
   * 设置默认 Agent
   */
  setDefaultAgent(key: string): void {
    const agent = this.agents.get(key);
    if (agent) {
      this.defaultAgent = agent;
    }
  }

  /**
   * 初始化默认 Agent
   */
  private initializeDefaultAgent(): void {
    // 从环境变量获取配置
    const arkApiKey = process.env.NEXT_PUBLIC_ARK_API_KEY;
    const arkModelName = process.env.NEXT_PUBLIC_ARK_MODEL_NAME || 'ep-20250617131345-rshkp';
    const arkEndpoint = process.env.NEXT_PUBLIC_ARK_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3';
    
    const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    const openaiModelName = process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || 'gpt-4';
    
    const anthropicApiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    const anthropicModelName = process.env.NEXT_PUBLIC_ANTHROPIC_MODEL_NAME || 'claude-3-sonnet-20240229';
    
    const qwenApiKey = process.env.NEXT_PUBLIC_QWEN_API_KEY;
    const qwenModelName = process.env.NEXT_PUBLIC_QWEN_MODEL_NAME || 'qwen-max';
    const qwenEndpoint = process.env.NEXT_PUBLIC_QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    
    const defaultTemperature = parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7');
    const defaultMaxTokens = parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048');

    console.log('AgentManager: 初始化默认 Agent');
    console.log('- NEXT_PUBLIC_ARK_API_KEY:', arkApiKey ? '已配置' : '未配置');
    console.log('- NEXT_PUBLIC_OPENAI_API_KEY:', openaiApiKey ? '已配置' : '未配置');
    console.log('- NEXT_PUBLIC_ANTHROPIC_API_KEY:', anthropicApiKey ? '已配置' : '未配置');
    console.log('- NEXT_PUBLIC_QWEN_API_KEY:', qwenApiKey ? '已配置' : '未配置');

    // 优先级：火山引擎 > Qwen > OpenAI > Claude
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
    } else if (qwenApiKey) {
      console.log('使用 Qwen 作为默认 Agent');
      this.registerAgent('qwen-default', {
        apiKey: qwenApiKey,
        provider: 'qwen',
        modelName: qwenModelName,
        endpoint: qwenEndpoint,
        temperature: defaultTemperature,
        maxTokens: defaultMaxTokens,
        enableMemory: false
      });
      this.setDefaultAgent('qwen-default');
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
      console.warn('AgentManager: 未找到任何 API 密钥配置');
      console.warn('请在 .env.local 文件中配置 NEXT_PUBLIC_ARK_API_KEY、NEXT_PUBLIC_OPENAI_API_KEY、NEXT_PUBLIC_ANTHROPIC_API_KEY 或 NEXT_PUBLIC_QWEN_API_KEY');
      console.warn('或者通过前端界面手动配置 Agent');
    }
  }

  /**
   * 从 AIModelConfig 创建 Agent
   */
  createAgentFromConfig(config: AIModelConfig): DiagramAgent {
    const agentConfig: AgentConfig = {
      apiKey: config.apiKey || '',
      provider: config.provider as 'volcengine' | 'openai' | 'anthropic' | 'qwen',
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enableMemory: false,
      endpoint: config.endpoint
    };

    switch (config.provider) {
      case 'volcengine':
        return DiagramAgentFactory.createVolcengineAgent(agentConfig);
      case 'openai':
        return DiagramAgentFactory.createOpenAIAgent(agentConfig);
      case 'anthropic':
        return DiagramAgentFactory.createClaudeAgent(agentConfig);
      case 'qwen':
        return DiagramAgentFactory.createQwenAgent(agentConfig);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  /**
   * 测试 Agent 连接
   */
  async testAgent(key: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const agent = this.getAgent(key);
      if (!agent) {
        return {
          success: false,
          message: `Agent not found: ${key}`
        };
      }

      const testRequest: DiagramGenerationRequest = {
        description: '创建一个简单的登录流程图',
        diagramType: 'flowchart'
      };

      const startTime = Date.now();
      const result = await agent.generateDiagram(testRequest);
      const duration = Date.now() - startTime;

      return {
        success: true,
        message: 'Agent 测试成功',
        details: {
          duration,
          responseLength: result.mermaidCode.length,
          provider: result.metadata.provider,
          model: result.metadata.model
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Agent 测试失败: ${error.message}`,
        details: {
          error: error.message
        }
      };
    }
  }
}

// 全局 Agent Manager 实例
export const agentManager = new AgentManager();