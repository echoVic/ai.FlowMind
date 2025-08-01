/**
 * AI Agent 管理服务
 * 统一管理不同的 AI Agent 实例，提供会话级隔离
 */
import type { AIModelConfig } from '@/types/types';
import { DiagramAgent, DiagramAgentFactory, type DiagramGenerationRequest, type DiagramGenerationResult } from '../agents/DiagramAgent';

interface AgentConfig {
  apiKey: string;
  provider: 'volcengine' | 'openai' | 'anthropic' | 'qwen';
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  enableMemory?: boolean;
  endpoint?: string;
}

class AgentManager {
  private agents: Map<string, DiagramAgent> = new Map();
  private sessionAgents: Map<string, Map<string, DiagramAgent>> = new Map(); // sessionId -> modelKey -> agent
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
  async generateDiagram(request: DiagramGenerationRequest, agentKey?: string, sessionId?: string): Promise<DiagramGenerationResult> {
    const agent = this.getAgent(agentKey, sessionId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentKey || 'default'}`);
    }

    return agent.generateDiagram(request);
  }

  /**
   * 流式生成图表
   */
  async generateDiagramStream(
    request: DiagramGenerationRequest, 
    onStream?: (chunk: string) => void,
    agentKey?: string,
    sessionId?: string
  ): Promise<DiagramGenerationResult> {
    const agent = this.getAgent(agentKey, sessionId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentKey || 'default'}`);
    }

    return agent.generateDiagram(request, onStream);
  }

  /**
   * 优化图表
   */
  async optimizeDiagram(mermaidCode: string, requirements: string, agentKey?: string, sessionId?: string): Promise<DiagramGenerationResult> {
    const agent = this.getAgent(agentKey, sessionId);
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
   * 获取 Agent（支持会话隔离）
   */
  getAgent(key?: string, sessionId?: string): DiagramAgent | null {
    // 如果提供了sessionId，优先从会话级Agent中获取
    if (sessionId) {
      const sessionAgents = this.sessionAgents.get(sessionId);
      if (sessionAgents) {
        const agent = sessionAgents.get(key || 'default');
        if (agent) {
          return agent;
        }
      }
      
      // 如果会话级Agent不存在，创建一个新的
      return this.createSessionAgent(key || 'default', sessionId);
    }
    
    // 没有sessionId时，使用全局Agent（向后兼容）
    if (!key) {
      return this.defaultAgent;
    }
    return this.agents.get(key) || null;
  }

  /**
   * 创建会话级Agent
   */
  private createSessionAgent(agentKey: string, sessionId: string): DiagramAgent | null {
    // 获取全局Agent配置作为模板
    const templateAgent = this.agents.get(agentKey) || this.defaultAgent;
    if (!templateAgent) {
      console.warn(`No template agent found for key: ${agentKey}`);
      return null;
    }

    // 创建新的Agent实例（复制配置但独立历史）
    let newAgent: DiagramAgent;
    
    // 根据默认Agent的类型创建相应的新实例
    if (agentKey.includes('volcengine') || !agentKey.includes('-')) {
      const arkApiKey = process.env.NEXT_PUBLIC_ARK_API_KEY;
      if (!arkApiKey) return null;
      
      newAgent = DiagramAgentFactory.createVolcengineAgent({
        apiKey: arkApiKey,
        modelName: agentKey.includes('-') ? agentKey : process.env.NEXT_PUBLIC_ARK_MODEL_NAME || 'ep-20250617131345-rshkp',
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    } else if (agentKey.includes('qwen')) {
      const qwenApiKey = process.env.NEXT_PUBLIC_QWEN_API_KEY;
      if (!qwenApiKey) return null;
      
      newAgent = DiagramAgentFactory.createQwenAgent({
        apiKey: qwenApiKey,
        endpoint: process.env.NEXT_PUBLIC_QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        modelName: agentKey,
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    } else if (agentKey.includes('openai') || agentKey.includes('gpt')) {
      const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!openaiApiKey) return null;
      
      newAgent = DiagramAgentFactory.createOpenAIAgent({
        apiKey: openaiApiKey,
        modelName: agentKey,
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    } else if (agentKey.includes('claude') || agentKey.includes('anthropic')) {
      const anthropicApiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      if (!anthropicApiKey) return null;
      
      newAgent = DiagramAgentFactory.createClaudeAgent({
        apiKey: anthropicApiKey,
        modelName: agentKey,
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    } else {
      // 默认使用火山引擎
      const arkApiKey = process.env.NEXT_PUBLIC_ARK_API_KEY;
      if (!arkApiKey) return null;
      
      newAgent = DiagramAgentFactory.createVolcengineAgent({
        apiKey: arkApiKey,
        modelName: agentKey,
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    }

    // 存储到会话级Agent映射中
    if (!this.sessionAgents.has(sessionId)) {
      this.sessionAgents.set(sessionId, new Map());
    }
    this.sessionAgents.get(sessionId)!.set(agentKey, newAgent);
    
    console.log(`Created session agent: ${agentKey} for session: ${sessionId}`);
    return newAgent;
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
    
    // 清空所有会话级Agent的历史
    this.sessionAgents.forEach(sessionMap => {
      sessionMap.forEach(agent => agent.clearHistory());
    });
  }

  /**
   * 清空指定 Agent 的对话历史
   */
  clearAgentHistory(agentKey?: string, sessionId?: string): void {
    const agent = this.getAgent(agentKey, sessionId);
    if (agent) {
      agent.clearHistory();
      console.log(`Agent history cleared: ${agentKey || 'default'} for session: ${sessionId || 'global'}`);
    }
  }

  /**
   * 清空指定会话的所有Agent历史
   */
  clearSessionHistory(sessionId: string): void {
    const sessionMap = this.sessionAgents.get(sessionId);
    if (sessionMap) {
      sessionMap.forEach((agent, agentKey) => {
        agent.clearHistory();
        console.log(`Session agent history cleared: ${agentKey} for session: ${sessionId}`);
      });
    }
  }

  /**
   * 删除指定会话的所有Agent
   */
  removeSession(sessionId: string): void {
    this.sessionAgents.delete(sessionId);
    console.log(`Session removed: ${sessionId}`);
  }

  /**
   * 获取指定 Agent 的对话历史
   */
  getAgentHistory(agentKey?: string, sessionId?: string): Array<{role: string, content: string}> {
    const agent = this.getAgent(agentKey, sessionId);
    if (agent && typeof agent.getConversationHistory === 'function') {
      return agent.getConversationHistory();
    }
    return [];
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
        enableMemory: true
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
        enableMemory: true
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
        enableMemory: true
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
        enableMemory: true
      });
      this.setDefaultAgent('anthropic-default');
    } else {
      console.warn('AgentManager: 未找到任何 API 密钥配置，将不会设置默认 Agent。请在 .env.local 文件中配置 NEXT_PUBLIC_ARK_API_KEY、NEXT_PUBLIC_OPENAI_API_KEY、NEXT_PUBLIC_ANTHROPIC_API_KEY 或 NEXT_PUBLIC_QWEN_API_KEY');
      console.warn('AgentManager: 当前可用的 Agent 列表:', this.getAvailableAgents());
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
      enableMemory: true,
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
  async testAgent(key: string, sessionId?: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const agent = this.getAgent(key, sessionId);
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