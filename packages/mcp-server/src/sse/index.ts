/**
 * SSE (Server-Sent Events) module for streaming communication
 * 
 * This module provides TypeScript interfaces and types for implementing
 * Server-Sent Events functionality alongside the existing MCP protocol.
 */

// Export core types and interfaces
export * from './events';
export * from './SSEConnectionManager';
export * from './SSEEventEmitter';
export * from './SSEServer';
export * from './StreamingHandlers';
export * from './types';

// Re-export commonly used types for convenience
export type {
  SSEConfiguration, SSEConnection, SSEEvent, SSEServerConfig
} from './types';

export type {
  ErrorEvent, FormatConversionProgressEvent, HeartbeatEvent, OptimizationProgressEvent, ResultEvent, SSEEventData, StreamingContext, TemplateProgressEvent, ValidationProgressEvent
} from './events';

export { SSEEventType } from './types';
