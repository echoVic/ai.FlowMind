/**
 * Re-export DiagramAgent from diagram-core package
 * This file maintains backward compatibility while using the shared core package
 */
import { 
  DiagramAgent, 
  DiagramAgentFactory, 
  type DiagramGenerationRequest, 
  type DiagramGenerationResult,
  type DiagramAgentConfig,
  QwenLangChainProvider,
  VolcengineLangChainProvider
} from '@flowmind/diagram-core';

// Re-export all the classes and types for backward compatibility
export {
  DiagramAgent,
  DiagramAgentFactory,
  QwenLangChainProvider,
  VolcengineLangChainProvider,
  type DiagramGenerationRequest,
  type DiagramGenerationResult,
  type DiagramAgentConfig
};
