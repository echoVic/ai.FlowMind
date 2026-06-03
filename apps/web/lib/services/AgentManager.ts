/**
 * AI Agent 管理服务
 * 统一管理不同的 AI Agent 实例，提供会话级隔离
 */
import { BladeDiagramAgent } from '../agents/BladeDiagramAgent';
import type { AgentConfig, DiagramGenerationRequest, DiagramGenerationResult, ManagedDiagramAgent } from '../agents/types';

export type { AgentConfig, ManagedDiagramAgent };

export class AgentManager {
  private agents: Map<string, ManagedDiagramAgent> = new Map();
  private sessionAgents: Map<string, Map<string, ManagedDiagramAgent>> = new Map();
  private defaultAgent: ManagedDiagramAgent | null = null;
  private readonly agentFactory: (config: AgentConfig) => ManagedDiagramAgent;

  constructor(agentFactory: (config: AgentConfig) => ManagedDiagramAgent = (config) => new BladeDiagramAgent(config)) {
    this.agentFactory = agentFactory;
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
    const agent = this.createAgent(config);
    this.agents.set(key, agent);
    console.log(`Agent registered: ${key} (${config.provider})`);
  }

  private createAgent(config: AgentConfig): ManagedDiagramAgent {
    return this.agentFactory(config);
  }

  /**
   * 获取 Agent（支持会话隔离）
   */
  getAgent(key?: string, sessionId?: string): ManagedDiagramAgent | null {
    if (sessionId) {
      const sessionAgents = this.sessionAgents.get(sessionId);
      if (sessionAgents) {
        const agent = sessionAgents.get(key || 'default');
        if (agent) {
          return agent;
        }
      }
      
      return this.createSessionAgent(key || 'default', sessionId);
    }
    
    if (!key) {
      return this.defaultAgent;
    }
    return this.agents.get(key) || null;
  }

  /**
   * 创建会话级Agent
   */
  private createSessionAgent(agentKey: string, sessionId: string): ManagedDiagramAgent | null {
    const templateAgent = this.agents.get(agentKey) || this.defaultAgent;
    if (!templateAgent) {
      console.warn(`No template agent found for key: ${agentKey}`);
      return null;
    }

    let newAgent: ManagedDiagramAgent;
    
    if (agentKey.includes('volcengine') || !agentKey.includes('-')) {
      const arkApiKey = process.env.NEXT_PUBLIC_ARK_API_KEY;
      if (!arkApiKey) return null;
      
      newAgent = this.createAgent({
        apiKey: arkApiKey,
        provider: 'volcengine',
        modelName: agentKey.includes('-') ? agentKey : process.env.NEXT_PUBLIC_ARK_MODEL_NAME || 'ep-20250617131345-rshkp',
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    } else if (agentKey.includes('qwen')) {
      const qwenApiKey = process.env.NEXT_PUBLIC_QWEN_API_KEY;
      if (!qwenApiKey) return null;
      
      newAgent = this.createAgent({
        apiKey: qwenApiKey,
        provider: 'qwen',
        endpoint: process.env.NEXT_PUBLIC_QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        modelName: agentKey,
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    } else if (agentKey.includes('openai') || agentKey.includes('gpt')) {
      const openaiApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!openaiApiKey) return null;
      
      newAgent = this.createAgent({
        apiKey: openaiApiKey,
        provider: 'openai',
        modelName: agentKey,
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    } else if (agentKey.includes('claude') || agentKey.includes('anthropic')) {
      const anthropicApiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
      if (!anthropicApiKey) return null;
      
      newAgent = this.createAgent({
        apiKey: anthropicApiKey,
        provider: 'anthropic',
        modelName: agentKey,
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    } else {
      const arkApiKey = process.env.NEXT_PUBLIC_ARK_API_KEY;
      if (!arkApiKey) return null;
      
      newAgent = this.createAgent({
        apiKey: arkApiKey,
        provider: 'volcengine',
        modelName: agentKey,
        temperature: parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.7'),
        maxTokens: parseInt(process.env.NEXT_PUBLIC_DEFAULT_MAX_TOKENS || '2048'),
        enableMemory: true
      });
    }

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
    const arkApiKey = process.env.NEXT_PUBLIC_ARK_API_KEY;
    const arkModelName = process.env.NEXT_PUBLIC_ARK_MODEL_NAME || 'ep-20250617131345-rshkp';
    
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
        message: `Agent 测试失败: ${(error as Error).message}`,
        details: {
          error: (error as Error).message
        }
      };
    }
  }
}

// 全局 Agent Manager 实例
export const agentManager = new AgentManager();
