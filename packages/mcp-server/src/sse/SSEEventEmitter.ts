/**
 * SSE Event Emitter class for formatting and emitting server-sent events
 */

import { ErrorEvent, HeartbeatEvent, ResultEvent } from './events';
import { SSEEvent, SSEEventType } from './types';

/**
 * SSE Event Emitter class that handles event formatting and emission logic
 */
export class SSEEventEmitter {
  private connectionId: string;
  private requestId: string;

  constructor(connectionId: string, requestId: string) {
    this.connectionId = connectionId;
    this.requestId = requestId;
  }

  /**
   * Emit a generic SSE event
   */
  emit(event: SSEEvent): void {
    // This method would be overridden by the actual SSE server implementation
    // For now, it serves as the base interface for event emission
    console.log(`[SSE] Emitting event for connection ${this.connectionId}:`, event);
  }

  /**
   * Emit a progress event with percentage and message
   */
  emitProgress(percentage: number, message: string, operation: string = 'processing'): void {
    const progressEvent: SSEEvent = {
      event: SSEEventType.PROGRESS,
      data: {
        type: 'progress',
        requestId: this.requestId,
        operation,
        percentage: Math.max(0, Math.min(100, percentage)), // Clamp between 0-100
        message,
        timestamp: new Date().toISOString()
      }
    };

    this.emit(progressEvent);
  }

  /**
   * Emit a result event with operation data
   */
  emitResult(data: any, operation: string = 'processing'): void {
    const resultEvent: ResultEvent = {
      type: 'result',
      requestId: this.requestId,
      operation,
      data,
      timestamp: new Date().toISOString()
    };

    const sseEvent: SSEEvent = {
      event: SSEEventType.RESULT,
      data: resultEvent
    };

    this.emit(sseEvent);
  }

  /**
   * Emit an error event
   */
  emitError(error: Error, operation: string = 'processing'): void {
    const errorEvent: ErrorEvent = {
      type: 'error',
      requestId: this.requestId,
      operation,
      error: {
        message: error.message,
        code: (error as any).code,
        details: (error as any).details
      },
      timestamp: new Date().toISOString()
    };

    const sseEvent: SSEEvent = {
      event: SSEEventType.ERROR,
      data: errorEvent
    };

    this.emit(sseEvent);
  }

  /**
   * Emit a heartbeat event
   */
  emitHeartbeat(status?: { activeConnections: number; uptime: number }): void {
    const heartbeatEvent: HeartbeatEvent = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      status
    };

    const sseEvent: SSEEvent = {
      event: SSEEventType.HEARTBEAT,
      data: heartbeatEvent
    };

    this.emit(sseEvent);
  }

  /**
   * Emit validation start event
   */
  emitValidationStart(): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.VALIDATION_START,
      data: {
        type: 'progress',
        requestId: this.requestId,
        operation: 'validation',
        percentage: 0,
        message: 'Starting validation...',
        timestamp: new Date().toISOString(),
        stage: 'parsing'
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit validation progress event
   */
  emitValidationProgress(
    percentage: number, 
    stage: 'parsing' | 'syntax_check' | 'semantic_analysis' | 'complete',
    message: string,
    details?: { linesProcessed: number; totalLines: number; issuesFound: number }
  ): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.VALIDATION_PROGRESS,
      data: {
        type: 'progress',
        requestId: this.requestId,
        operation: 'validation',
        percentage: Math.max(0, Math.min(100, percentage)),
        message,
        timestamp: new Date().toISOString(),
        stage,
        details
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit validation complete event
   */
  emitValidationComplete(result: any): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.VALIDATION_COMPLETE,
      data: {
        type: 'result',
        requestId: this.requestId,
        operation: 'validation',
        data: result,
        timestamp: new Date().toISOString()
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit optimization start event
   */
  emitOptimizationStart(): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.OPTIMIZATION_START,
      data: {
        type: 'progress',
        requestId: this.requestId,
        operation: 'optimization',
        percentage: 0,
        message: 'Starting optimization...',
        timestamp: new Date().toISOString(),
        stage: 'analysis'
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit optimization progress event
   */
  emitOptimizationProgress(
    percentage: number,
    stage: 'analysis' | 'layout' | 'readability' | 'formatting' | 'complete',
    message: string,
    details?: { suggestionsGenerated: number; optimizationsApplied: number; currentScore: number; [key: string]: any }
  ): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.OPTIMIZATION_PROGRESS,
      data: {
        type: 'progress',
        requestId: this.requestId,
        operation: 'optimization',
        percentage: Math.max(0, Math.min(100, percentage)),
        message,
        timestamp: new Date().toISOString(),
        stage,
        details
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit optimization complete event
   */
  emitOptimizationComplete(result: any): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.OPTIMIZATION_COMPLETE,
      data: {
        type: 'result',
        requestId: this.requestId,
        operation: 'optimization',
        data: result,
        timestamp: new Date().toISOString()
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit template start event
   */
  emitTemplateStart(): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.TEMPLATE_START,
      data: {
        type: 'progress',
        requestId: this.requestId,
        operation: 'template',
        percentage: 0,
        message: 'Starting template processing...',
        timestamp: new Date().toISOString(),
        stage: 'selection'
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit template progress event
   */
  emitTemplateProgress(
    percentage: number,
    stage: 'selection' | 'application' | 'customization' | 'complete',
    message: string,
    details?: { templatesProcessed: number; totalTemplates: number; currentTemplate?: string }
  ): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.TEMPLATE_PROGRESS,
      data: {
        type: 'progress',
        requestId: this.requestId,
        operation: 'template',
        percentage: Math.max(0, Math.min(100, percentage)),
        message,
        timestamp: new Date().toISOString(),
        stage,
        details
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit template complete event
   */
  emitTemplateComplete(result: any): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.TEMPLATE_COMPLETE,
      data: {
        type: 'result',
        requestId: this.requestId,
        operation: 'template',
        data: result,
        timestamp: new Date().toISOString()
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit format conversion start event
   */
  emitFormatConversionStart(): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.FORMAT_CONVERSION_START,
      data: {
        type: 'progress',
        requestId: this.requestId,
        operation: 'format_conversion',
        percentage: 0,
        message: 'Starting format conversion...',
        timestamp: new Date().toISOString(),
        stage: 'detection'
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit format conversion progress event
   */
  emitFormatConversionProgress(
    percentage: number,
    stage: 'detection' | 'parsing' | 'conversion' | 'optimization' | 'complete',
    message: string,
    details?: { sourceFormat?: string; targetFormat?: string; elementsFound?: number; conversionSteps?: number; success?: boolean; preservedElements?: any }
  ): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.FORMAT_CONVERSION_PROGRESS,
      data: {
        type: 'progress',
        requestId: this.requestId,
        operation: 'format_conversion',
        percentage: Math.max(0, Math.min(100, percentage)),
        message,
        timestamp: new Date().toISOString(),
        stage,
        details
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Emit format conversion complete event
   */
  emitFormatConversionComplete(result: any): void {
    const sseEvent: SSEEvent = {
      event: SSEEventType.FORMAT_CONVERSION_COMPLETE,
      data: {
        type: 'result',
        requestId: this.requestId,
        operation: 'format_conversion',
        data: result,
        timestamp: new Date().toISOString()
      }
    };

    this.emit(sseEvent);
  }

  /**
   * Format an SSE event for transmission (instance method)
   */
  formatEvent(event: SSEEvent): string {
    return SSEEventEmitter.formatSSEEvent(event);
  }

  /**
   * Format SSE event data for transmission
   * Converts an SSE event into the proper SSE format string
   */
  static formatSSEEvent(event: SSEEvent): string {
    let formatted = '';

    // Add event ID if provided
    if (event.id) {
      formatted += `id: ${event.id}\n`;
    }

    // Add event type
    formatted += `event: ${event.event}\n`;

    // Add data (JSON stringify for complex objects)
    const dataString = typeof event.data === 'string' 
      ? event.data 
      : JSON.stringify(event.data);
    
    // Handle multi-line data by prefixing each line with "data: "
    const dataLines = dataString.split('\n');
    for (const line of dataLines) {
      formatted += `data: ${line}\n`;
    }

    // Add retry interval if provided
    if (event.retry) {
      formatted += `retry: ${event.retry}\n`;
    }

    // Add final newline to complete the event
    formatted += '\n';

    return formatted;
  }

  /**
   * Validate SSE event data
   */
  static validateEvent(event: SSEEvent): boolean {
    if (!event.event || typeof event.event !== 'string') {
      return false;
    }

    if (event.data === undefined || event.data === null) {
      return false;
    }

    if (event.id && typeof event.id !== 'string') {
      return false;
    }

    if (event.retry && (typeof event.retry !== 'number' || event.retry < 0)) {
      return false;
    }

    return true;
  }
}