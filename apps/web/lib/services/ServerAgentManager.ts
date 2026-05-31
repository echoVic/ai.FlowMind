import { BladeDiagramAgent } from '../agents/BladeDiagramAgent';
import { AgentManager, type AgentConfig } from './AgentManager';

function shouldUseBladeAgent(): boolean {
  const configuredEngine = process.env.NEXT_PUBLIC_AGENT_ENGINE || process.env.AGENT_ENGINE || 'blade';
  return configuredEngine !== 'legacy';
}

export const serverAgentManager = new AgentManager(
  shouldUseBladeAgent()
    ? (config: AgentConfig) => new BladeDiagramAgent(config)
    : undefined,
);
