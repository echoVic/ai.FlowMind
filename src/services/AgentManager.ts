/**
 * AI Agent 管理服务
 * 统一管理不同的 AI Agent 实例，提供简单的调用接口
 */
import { DiagramAgent, DiagramAgentFactory, DiagramGenerationRequest, DiagramGenerationResult } from '../agents/DiagramAgent';
import type { AIModelConfig } from '../shared/types';

export interface AgentConfig {
  apiKey: string;
  provider: 'volcengine' | 'openai' | 'anthropic';
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  enableMemory?: boolean;
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
    // 尝试从环境变量获取默认配置
    const arkApiKey = process.env.ARK_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (arkApiKey) {
      this.registerAgent('volcengine-default', {
        apiKey: arkApiKey,
        provider: 'volcengine',
        modelName: 'ep-20250617131345-rshkp',
        temperature: 0.7,
        maxTokens: 2048,
        enableMemory: false
      });
      this.setDefaultAgent('volcengine-default');
    } else if (openaiApiKey) {
      this.registerAgent('openai-default', {
        apiKey: openaiApiKey,
        provider: 'openai',
        modelName: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2048,
        enableMemory: false
      });
      this.setDefaultAgent('openai-default');
    } else if (anthropicApiKey) {
      this.registerAgent('anthropic-default', {
        apiKey: anthropicApiKey,
        provider: 'anthropic',
        modelName: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        maxTokens: 2048,
        enableMemory: false
      });
      this.setDefaultAgent('anthropic-default');
    } else {
      console.warn('No API keys found in environment variables. Please register agents manually.');
    }
  }

  /**
   * 从 AIModelConfig 创建 Agent
   */
  createAgentFromConfig(config: AIModelConfig): DiagramAgent {
    const agentConfig: AgentConfig = {
      apiKey: config.apiKey || '',
      provider: config.provider as 'volcengine' | 'openai' | 'anthropic',
      modelName: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      enableMemory: false
    };

    switch (config.provider) {
      case 'volcengine':
        return DiagramAgentFactory.createVolcengineAgent(agentConfig);
      case 'openai':
        return DiagramAgentFactory.createOpenAIAgent(agentConfig);
      case 'anthropic':
        return DiagramAgentFactory.createClaudeAgent(agentConfig);
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