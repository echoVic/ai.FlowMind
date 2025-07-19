/**
 * Web应用服务层导出
 */

// 导出WebAgentManager
export { WebAgentManager, webAgentManager, type WebAgentConfig } from './WebAgentManager';

// 重新导出diagram-core的类型，方便使用
export type { 
  DiagramGenerationRequest, 
  DiagramGenerationResult, 
  AIModelConfig 
} from '@flowmind/diagram-core';
