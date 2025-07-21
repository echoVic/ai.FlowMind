/**
 * Unit tests for SSEEventEmitter class
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SSEEventEmitter } from '../SSEEventEmitter';
import { SSEEventType } from '../types';

describe('SSEEventEmitter', () => {
  let emitter: SSEEventEmitter;
  const mockConnectionId = 'conn-123';
  const mockRequestId = 'req-456';

  beforeEach(() => {
    emitter = new SSEEventEmitter(mockConnectionId, mockRequestId);
    // Mock console.log to avoid test output noise
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('should create an instance with connection and request IDs', () => {
      expect(emitter).toBeInstanceOf(SSEEventEmitter);
    });
  });

  describe('emit', () => {
    it('should log the event for the connection', () => {
      const mockEvent = {
        event: 'test',
        data: { message: 'test data' }
      };

      emitter.emit(mockEvent);

      expect(console.log).toHaveBeenCalledWith(
        `[SSE] Emitting event for connection ${mockConnectionId}:`,
        mockEvent
      );
    });
  });

  describe('emitProgress', () => {
    it('should emit a progress event with correct format', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');
      const percentage = 50;
      const message = 'Processing...';
      const operation = 'validation';

      emitter.emitProgress(percentage, message, operation);

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.PROGRESS,
        data: {
          type: 'progress',
          requestId: mockRequestId,
          operation,
          percentage,
          message,
          timestamp: expect.any(String)
        }
      });
    });

    it('should clamp percentage between 0 and 100', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');

      // Test negative percentage
      emitter.emitProgress(-10, 'test');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ percentage: 0 })
        })
      );

      // Test percentage over 100
      emitter.emitProgress(150, 'test');
      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ percentage: 100 })
        })
      );
    });

    it('should use default operation when not provided', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');

      emitter.emitProgress(50, 'test');

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ operation: 'processing' })
        })
      );
    });
  });

  describe('emitResult', () => {
    it('should emit a result event with correct format', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');
      const resultData = { success: true, value: 'test result' };
      const operation = 'validation';

      emitter.emitResult(resultData, operation);

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.RESULT,
        data: {
          type: 'result',
          requestId: mockRequestId,
          operation,
          data: resultData,
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('emitError', () => {
    it('should emit an error event with correct format', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');
      const error = new Error('Test error');
      const operation = 'validation';

      emitter.emitError(error, operation);

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.ERROR,
        data: {
          type: 'error',
          requestId: mockRequestId,
          operation,
          error: {
            message: 'Test error',
            code: undefined,
            details: undefined
          },
          timestamp: expect.any(String)
        }
      });
    });

    it('should include error code and details when available', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');
      const error = new Error('Test error') as any;
      error.code = 'VALIDATION_ERROR';
      error.details = { line: 5, column: 10 };

      emitter.emitError(error);

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            error: {
              message: 'Test error',
              code: 'VALIDATION_ERROR',
              details: { line: 5, column: 10 }
            }
          })
        })
      );
    });
  });

  describe('emitHeartbeat', () => {
    it('should emit a heartbeat event without status', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');

      emitter.emitHeartbeat();

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.HEARTBEAT,
        data: {
          type: 'heartbeat',
          timestamp: expect.any(String),
          status: undefined
        }
      });
    });

    it('should emit a heartbeat event with status', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');
      const status = { activeConnections: 5, uptime: 12345 };

      emitter.emitHeartbeat(status);

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.HEARTBEAT,
        data: {
          type: 'heartbeat',
          timestamp: expect.any(String),
          status
        }
      });
    });
  });

  describe('validation events', () => {
    it('should emit validation start event', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');

      emitter.emitValidationStart();

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.VALIDATION_START,
        data: {
          type: 'progress',
          requestId: mockRequestId,
          operation: 'validation',
          percentage: 0,
          message: 'Starting validation...',
          timestamp: expect.any(String),
          stage: 'parsing'
        }
      });
    });

    it('should emit validation progress event', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');
      const details = { linesProcessed: 10, totalLines: 20, issuesFound: 2 };

      emitter.emitValidationProgress(50, 'syntax_check', 'Checking syntax...', details);

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.VALIDATION_PROGRESS,
        data: {
          type: 'progress',
          requestId: mockRequestId,
          operation: 'validation',
          percentage: 50,
          message: 'Checking syntax...',
          timestamp: expect.any(String),
          stage: 'syntax_check',
          details
        }
      });
    });

    it('should emit validation complete event', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');
      const result = { valid: true, errors: [] };

      emitter.emitValidationComplete(result);

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.VALIDATION_COMPLETE,
        data: {
          type: 'result',
          requestId: mockRequestId,
          operation: 'validation',
          data: result,
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('optimization events', () => {
    it('should emit optimization start event', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');

      emitter.emitOptimizationStart();

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.OPTIMIZATION_START,
        data: {
          type: 'progress',
          requestId: mockRequestId,
          operation: 'optimization',
          percentage: 0,
          message: 'Starting optimization...',
          timestamp: expect.any(String),
          stage: 'analysis'
        }
      });
    });

    it('should emit optimization progress event', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');
      const details = { suggestionsGenerated: 5, optimizationsApplied: 3, currentScore: 85 };

      emitter.emitOptimizationProgress(75, 'readability', 'Improving readability...', details);

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.OPTIMIZATION_PROGRESS,
        data: {
          type: 'progress',
          requestId: mockRequestId,
          operation: 'optimization',
          percentage: 75,
          message: 'Improving readability...',
          timestamp: expect.any(String),
          stage: 'readability',
          details
        }
      });
    });

    it('should emit optimization complete event', () => {
      const emitSpy = vi.spyOn(emitter, 'emit');
      const result = { optimized: true, suggestions: ['suggestion1', 'suggestion2'] };

      emitter.emitOptimizationComplete(result);

      expect(emitSpy).toHaveBeenCalledWith({
        event: SSEEventType.OPTIMIZATION_COMPLETE,
        data: {
          type: 'result',
          requestId: mockRequestId,
          operation: 'optimization',
          data: result,
          timestamp: expect.any(String)
        }
      });
    });
  });

  describe('formatSSEEvent', () => {
    it('should format a basic SSE event correctly', () => {
      const event = {
        event: 'test',
        data: 'simple data'
      };

      const formatted = SSEEventEmitter.formatSSEEvent(event);

      expect(formatted).toBe('event: test\ndata: simple data\n\n');
    });

    it('should format SSE event with ID and retry', () => {
      const event = {
        id: 'event-123',
        event: 'test',
        data: 'test data',
        retry: 5000
      };

      const formatted = SSEEventEmitter.formatSSEEvent(event);

      expect(formatted).toBe('id: event-123\nevent: test\ndata: test data\nretry: 5000\n\n');
    });

    it('should format SSE event with JSON data', () => {
      const event = {
        event: 'test',
        data: { message: 'hello', count: 42 }
      };

      const formatted = SSEEventEmitter.formatSSEEvent(event);

      expect(formatted).toBe('event: test\ndata: {"message":"hello","count":42}\n\n');
    });

    it('should handle multi-line data correctly', () => {
      const event = {
        event: 'test',
        data: 'line1\nline2\nline3'
      };

      const formatted = SSEEventEmitter.formatSSEEvent(event);

      expect(formatted).toBe('event: test\ndata: line1\ndata: line2\ndata: line3\n\n');
    });
  });

  describe('validateEvent', () => {
    it('should validate a correct SSE event', () => {
      const event = {
        event: 'test',
        data: 'test data'
      };

      expect(SSEEventEmitter.validateEvent(event)).toBe(true);
    });

    it('should reject event without event type', () => {
      const event = {
        data: 'test data'
      } as any;

      expect(SSEEventEmitter.validateEvent(event)).toBe(false);
    });

    it('should reject event with non-string event type', () => {
      const event = {
        event: 123,
        data: 'test data'
      } as any;

      expect(SSEEventEmitter.validateEvent(event)).toBe(false);
    });

    it('should reject event without data', () => {
      const event = {
        event: 'test'
      } as any;

      expect(SSEEventEmitter.validateEvent(event)).toBe(false);
    });

    it('should reject event with null data', () => {
      const event = {
        event: 'test',
        data: null
      };

      expect(SSEEventEmitter.validateEvent(event)).toBe(false);
    });

    it('should reject event with non-string ID', () => {
      const event = {
        event: 'test',
        data: 'test data',
        id: 123
      } as any;

      expect(SSEEventEmitter.validateEvent(event)).toBe(false);
    });

    it('should reject event with negative retry value', () => {
      const event = {
        event: 'test',
        data: 'test data',
        retry: -1000
      };

      expect(SSEEventEmitter.validateEvent(event)).toBe(false);
    });

    it('should accept event with valid optional fields', () => {
      const event = {
        event: 'test',
        data: 'test data',
        id: 'event-123',
        retry: 5000
      };

      expect(SSEEventEmitter.validateEvent(event)).toBe(true);
    });
  });
});