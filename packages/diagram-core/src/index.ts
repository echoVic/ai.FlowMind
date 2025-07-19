/**
 * @flowmind/diagram-core
 * 
 * Core business logic package for FlowMind AI diagram generation.
 * This package contains reusable components that can be used across
 * web applications and browser extensions.
 */

// Export DiagramAgent and related classes
export {
  DiagramAgent,
  DiagramAgentFactory,
  QwenLangChainProvider,
  VolcengineLangChainProvider,
  type DiagramGenerationRequest,
  type DiagramGenerationResult,
  type DiagramAgentConfig
} from './agents/DiagramAgent';

// Export AgentManager and singleton instance
export {
  AgentManager,
  agentManager
} from './services/AgentManager';

// Export all type definitions
export type {
  DiagramData,
  AIResponse,
  GenerateRequest,
  OptimizeRequest,
  AIModelConfig,
  DirectCallConfig,
  AIServiceResponse,
  ProviderConfig
} from './types';

// Export business logic functions from hooks
export {
  ensureAgentRegistered,
  generateDiagramWithAgent,
  optimizeDiagramWithAgent,
  validateAgentConnection,
  diagnoseAgentConnection,
  getProviderFromModel,
  // New core functions that match web app API expectations
  generateDiagramCore,
  optimizeDiagramCore,
  validateConnectionCore,
  // Additional utility functions
  generateDiagram,
  optimizeDiagram,
  validateDiagramCode,
  fixDiagramCode,
  getExamplePrompts,
  estimateComplexity,
  getRecommendedModelConfig
} from './hooks/useDiagramGenerator';

// Re-export commonly used types for convenience
export type {
  DiagramGenerationRequest as GenerationRequest,
  DiagramGenerationResult as GenerationResult
} from './agents/DiagramAgent';
