import { BladeDiagramAgent } from '../agents/BladeDiagramAgent';
import { AgentManager } from './AgentManager';

export const serverAgentManager = new AgentManager(
  (config) => new BladeDiagramAgent(config)
);
