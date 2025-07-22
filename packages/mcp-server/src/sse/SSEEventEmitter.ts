/**
 * SSE Event Formatter - Static utility for StreamableHttp architecture
 * Provides static methods for formatting Server-Sent Events
 */

import { SSEEvent, SSEEventType } from './types';

/**
 * Static utility class for formatting SSE events in StreamableHttp architecture
 * No longer manages connections or state - purely for event formatting
 */
export class SSEEventFormatter {
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

  /**
   * Create a progress event
   */
  static createProgressEvent(
    event: string,
    operation: string,
    percentage: number,
    message: string,
    stage?: string,
    details?: any
  ): SSEEvent {
    return {
      event,
      data: {
        type: 'progress',
        operation,
        percentage: Math.max(0, Math.min(100, percentage)),
        message,
        timestamp: new Date().toISOString(),
        stage,
        details
      }
    };
  }

  /**
   * Create a result event
   */
  static createResultEvent(
    event: string,
    operation: string,
    data: any
  ): SSEEvent {
    return {
      event,
      data: {
        type: 'result',
        operation,
        data,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create an error event
   */
  static createErrorEvent(
    operation: string,
    error: string | Error
  ): SSEEvent {
    const errorMessage = typeof error === 'string' ? error : error.message;
    
    return {
      event: SSEEventType.ERROR,
      data: {
        type: 'error',
        operation,
        error: {
          message: errorMessage,
          timestamp: new Date().toISOString()
        }
      }
    };
  }

  /**
   * Create a start event
   */
  static createStartEvent(
    event: string,
    operation: string
  ): SSEEvent {
    return {
      event,
      data: {
        type: 'start',
        operation,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create a complete event
   */
  static createCompleteEvent(
    event: string,
    operation: string,
    result: any
  ): SSEEvent {
    return {
      event,
      data: {
        type: 'complete',
        operation,
        result,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Backward compatibility - export as SSEEventEmitter for existing code
export { SSEEventFormatter as SSEEventEmitter };

// Export default as the new formatter
export default SSEEventFormatter;
