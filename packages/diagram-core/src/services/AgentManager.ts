import { DiagramAgent, DiagramAgentFactory } from '../agents/DiagramAgent';
import type { AIModelConfig, DiagramGenerationRequest, DiagramGenerationResult } from '../types';

/**
 * AgentManager - Unified manager for AI Agent instances
 * Provides simplified calling interface with no UI dependencies
 */
export class AgentManager {
  private agents: Map<string, DiagramAgent> = new Map();
  private static instance: AgentManager;

  private constructor() {}

  /**
   * Get singleton instance of AgentManager
   */
  public static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  /**
   * Register or update an agent with the given configuration
   */
  public registerAgent(config: AIModelConfig): void {
    const agentKey = this.getAgentKey(config);
    const agent = DiagramAgentFactory.create(config);
    this.agents.set(agentKey, agent);
  }

  /**
   * Get an agent by configuration or ID
   */
  public getAgent(configOrId: AIModelConfig | string): DiagramAgent | undefined {
    if (typeof configOrId === 'string') {
      // If it's a string ID, find the agent by ID
      for (const [key, agent] of this.agents.entries()) {
        if (key.startsWith(`${configOrId}-`) || key.includes(`-${configOrId}-`)) {
          return agent;
        }
      }
      return undefined;
    } else {
      // If it's a config object, use the existing logic
      const agentKey = this.getAgentKey(configOrId);
      return this.agents.get(agentKey);
    }
  }

  /**
   * Ensure an agent is registered for the given configuration
   */
  public ensureAgent(config: AIModelConfig): DiagramAgent {
    let agent = this.getAgent(config);
    if (!agent) {
      this.registerAgent(config);
      agent = this.getAgent(config);
      if (!agent) {
        throw new Error(`Failed to create agent for provider: ${config.provider}`);
      }
    }
    return agent;
  }

  /**
   * Get available agents (alias for getRegisteredAgents for compatibility)
   */
  public getAvailableAgents(): string[] {
    return this.getRegisteredAgents();
  }

  /**
   * Generate diagram using the specified configuration
   */
  public async generateDiagram(
    config: AIModelConfig,
    request: DiagramGenerationRequest
  ): Promise<DiagramGenerationResult> {
    const agent = this.ensureAgent(config);
    return agent.generateDiagram(request);
  }

  /**
   * Optimize existing diagram using the specified configuration
   */
  public async optimizeDiagram(
    config: AIModelConfig,
    request: DiagramGenerationRequest
  ): Promise<DiagramGenerationResult> {
    const agent = this.ensureAgent(config);
    return agent.optimizeDiagram(request);
  }

  /**
   * Remove an agent from the manager
   */
  public removeAgent(configOrId: AIModelConfig | string): boolean {
    if (typeof configOrId === 'string') {
      // If it's a string ID, find and remove the agent by ID
      for (const key of this.agents.keys()) {
        if (key.startsWith(`${configOrId}-`) || key.includes(`-${configOrId}-`)) {
          return this.agents.delete(key);
        }
      }
      return false;
    } else {
      // If it's a config object, use the existing logic
      const agentKey = this.getAgentKey(configOrId);
      return this.agents.delete(agentKey);
    }
  }

  /**
   * Clear all registered agents
   */
  public clearAgents(): void {
    this.agents.clear();
  }

  /**
   * Get all registered agent configurations
   */
  public getRegisteredAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Check if an agent is registered for the given configuration or ID
   */
  public hasAgent(configOrId: AIModelConfig | string): boolean {
    if (typeof configOrId === 'string') {
      // If it's a string ID, check if any agent exists with this ID
      for (const key of this.agents.keys()) {
        if (key.startsWith(`${configOrId}-`) || key.includes(`-${configOrId}-`)) {
          return true;
        }
      }
      return false;
    } else {
      // If it's a config object, use the existing logic
      const agentKey = this.getAgentKey(configOrId);
      return this.agents.has(agentKey);
    }
  }

  /**
   * Generate a unique key for the agent based on configuration
   */
  private getAgentKey(config: AIModelConfig): string {
    const { id, provider, model, apiKey } = config;
    // Use the ID if available, otherwise fall back to provider-model combination
    if (id) {
      return `${id}-${provider}-${model}`;
    }
    // Create a unique key based on provider, model, and a hash of the API key
    const keyHash = apiKey ? this.hashString(apiKey) : 'no-key';
    return `${provider}-${model}-${keyHash}`;
  }

  /**
   * Simple hash function for creating agent keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Singleton instance of AgentManager for global use
 */
export const agentManager = AgentManager.getInstance();

/**
 * Default export for convenience
 */
export default AgentManager;
