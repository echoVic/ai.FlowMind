/**
 * AI Agent 管理服务
 * 统一管理不同的 AI Agent 实例，提供简单的调用接口
 * 
 * 此文件现在作为重新导出模块，从 @flowmind/diagram-core 包导入核心实现
 */

// 从 diagram-core 包导入 AgentManager 和相关类型
import { AgentManager, agentManager, type AgentConfig } from '@flowmind/diagram-core';

// 重新导出以保持向后兼容性
export { AgentManager, agentManager };
export type { AgentConfig };

// 默认导出
export default AgentManager;
