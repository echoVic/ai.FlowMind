/**
 * Data structures for streaming communication events
 */

/**
 * Base progress event interface
 */
export interface BaseProgressEvent {
  /** Event type identifier */
  type: 'progress';
  /** Unique request identifier */
  requestId: string;
  /** Operation being performed */
  operation: string;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Human-readable progress message */
  message: string;
  /** ISO timestamp of the event */
  timestamp: string;
}

/**
 * Validation progress event with validation-specific details
 */
export interface ValidationProgressEvent extends BaseProgressEvent {
  operation: 'validation';
  /** Current validation stage */
  stage: 'parsing' | 'syntax_check' | 'semantic_analysis' | 'complete';
  /** Optional validation details */
  details?: {
    /** Number of lines processed */
    linesProcessed: number;
    /** Total number of lines to process */
    totalLines: number;
    /** Number of issues found so far */
    issuesFound: number;
  };
}

/**
 * Optimization progress event with optimization-specific details
 */
export interface OptimizationProgressEvent extends BaseProgressEvent {
  operation: 'optimization';
  /** Current optimization stage */
  stage: 'analysis' | 'layout' | 'readability' | 'formatting' | 'complete';
  /** Optional optimization details */
  details?: {
    /** Number of suggestions generated */
    suggestionsGenerated: number;
    /** Number of optimizations applied */
    optimizationsApplied: number;
    /** Current optimization score */
    currentScore: number;
  };
}

/**
 * Template processing progress event
 */
export interface TemplateProgressEvent extends BaseProgressEvent {
  operation: 'template';
  /** Current template processing stage */
  stage: 'selection' | 'application' | 'customization' | 'complete';
  /** Optional template details */
  details?: {
    /** Number of templates processed */
    templatesProcessed: number;
    /** Total number of templates */
    totalTemplates: number;
    /** Currently selected template */
    currentTemplate?: string;
  };
}

/**
 * Format conversion progress event
 */
export interface FormatConversionProgressEvent extends BaseProgressEvent {
  operation: 'format_conversion';
  /** Current conversion stage */
  stage: 'parsing' | 'transformation' | 'formatting' | 'complete';
  /** Optional conversion details */
  details?: {
    /** Source format */
    sourceFormat: string;
    /** Target format */
    targetFormat: string;
    /** Conversion progress details */
    conversionSteps: number;
    /** Total conversion steps */
    totalSteps: number;
  };
}

/**
 * Result event for completed operations
 */
export interface ResultEvent {
  /** Event type identifier */
  type: 'result';
  /** Unique request identifier */
  requestId: string;
  /** Operation that was performed */
  operation: string;
  /** Result data payload */
  data: any;
  /** ISO timestamp of the event */
  timestamp: string;
}

/**
 * Error event for failed operations
 */
export interface ErrorEvent {
  /** Event type identifier */
  type: 'error';
  /** Unique request identifier */
  requestId: string;
  /** Operation that failed */
  operation: string;
  /** Error details */
  error: {
    /** Error message */
    message: string;
    /** Optional error code */
    code?: string;
    /** Optional additional error details */
    details?: any;
  };
  /** ISO timestamp of the event */
  timestamp: string;
}

/**
 * Heartbeat event for connection keep-alive
 */
export interface HeartbeatEvent {
  /** Event type identifier */
  type: 'heartbeat';
  /** ISO timestamp of the heartbeat */
  timestamp: string;
  /** Optional server status information */
  status?: {
    /** Number of active connections */
    activeConnections: number;
    /** Server uptime in milliseconds */
    uptime: number;
  };
}

/**
 * Union type for all possible SSE event data structures
 */
export type SSEEventData = 
  | ValidationProgressEvent
  | OptimizationProgressEvent
  | TemplateProgressEvent
  | FormatConversionProgressEvent
  | ResultEvent
  | ErrorEvent
  | HeartbeatEvent;

/**
 * Streaming context interface for handlers
 */
export interface StreamingContext {
  /** Connection identifier */
  connectionId: string;
  /** Request identifier */
  requestId: string;
  /** Function to emit events to the client */
  emit: (event: SSEEventData) => void;
}