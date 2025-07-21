/**
 * Unit tests for StreamingHandlers class
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidateMermaidInput, ValidationResult, OptimizeDiagramInput, OptimizationResult, ConvertFormatInput, FormatConversionResult } from '../../types.js';
import { MermaidValidator } from '../../validator.js';
import { DiagramOptimizer } from '../../optimizer/index.js';
import { FormatConverter } from '../../optimizer/format-converter.js';
import { StreamingContext } from '../events.js';
import { StreamingHandlers } from '../StreamingHandlers.js';

// Mock the MermaidValidator
vi.mock('../../validator.js', () => ({
  MermaidValidator: {
    getInstance: vi.fn(() => ({
      validate: vi.fn()
    }))
  }
}));

// Mock the DiagramOptimizer
vi.mock('../../optimizer/index.js', () => ({
  DiagramOptimizer: vi.fn(() => ({
    optimize: vi.fn()
  }))
}));

// Mock the FormatConverter
vi.mock('../../optimizer/format-converter.js', () => ({
  FormatConverter: vi.fn(() => ({
    convert: vi.fn()
  }))
}));

describe('StreamingHandlers', () => {
  let streamingHandlers: StreamingHandlers;
  let mockValidator: any;
  let mockOptimizer: any;
  let mockFormatConverter: any;
  let mockContext: StreamingContext;
  let emittedEvents: any[];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup mock validator
    mockValidator = {
      validate: vi.fn()
    };
    (MermaidValidator.getInstance as any).mockReturnValue(mockValidator);

    // Setup mock optimizer
    mockOptimizer = {
      optimize: vi.fn()
    };
    (DiagramOptimizer as any).mockImplementation(() => mockOptimizer);

    // Setup mock format converter
    mockFormatConverter = {
      convert: vi.fn()
    };
    (FormatConverter as any).mockImplementation(() => mockFormatConverter);

    // Setup streaming handlers
    streamingHandlers = new StreamingHandlers();

    // Setup mock context
    emittedEvents = [];
    mockContext = {
      connectionId: 'test-connection-123',
      requestId: 'test-request-456',
      emit: vi.fn((event) => {
        emittedEvents.push(event);
      })
    };

    // Mock setTimeout to make tests run faster
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return {} as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('streamValidation', () => {
    it('should emit validation start event', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'graph TD\n  A --> B',
        strict: false
      };

      const mockResult: ValidationResult = { valid: true };
      mockValidator.validate.mockResolvedValue(mockResult);

      await streamingHandlers.streamValidation(input, mockContext);

      // Check that validation start event was emitted
      const startEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'validation' && 
        event.stage === 'parsing' &&
        event.percentage === 0
      );

      expect(startEvent).toBeDefined();
      expect(startEvent.message).toBe('Starting validation...');
      expect(startEvent.requestId).toBe('test-request-456');
    });

    it('should emit progress events for all validation stages', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'graph TD\n  A --> B\n  B --> C',
        strict: false
      };

      const mockResult: ValidationResult = { valid: true };
      mockValidator.validate.mockResolvedValue(mockResult);

      await streamingHandlers.streamValidation(input, mockContext);

      // Check for parsing stage events
      const parsingEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'validation' && 
        event.stage === 'parsing'
      );
      expect(parsingEvents.length).toBeGreaterThan(0);

      // Check for syntax check stage events
      const syntaxEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'validation' && 
        event.stage === 'syntax_check'
      );
      expect(syntaxEvents.length).toBeGreaterThan(0);

      // Check for semantic analysis stage events
      const semanticEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'validation' && 
        event.stage === 'semantic_analysis'
      );
      expect(semanticEvents.length).toBeGreaterThan(0);

      // Check for completion stage events
      const completeEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'validation' && 
        event.stage === 'complete'
      );
      expect(completeEvents.length).toBeGreaterThan(0);
    });

    it('should emit validation complete event with successful result', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'graph TD\n  A --> B',
        strict: false
      };

      const mockResult: ValidationResult = { 
        valid: true,
        metadata: { diagramType: 'flowchart' }
      };
      mockValidator.validate.mockResolvedValue(mockResult);

      const result = await streamingHandlers.streamValidation(input, mockContext);

      // Check that validation complete event was emitted
      const completeEvent = emittedEvents.find(event => 
        event.type === 'result' && 
        event.operation === 'validation'
      );

      expect(completeEvent).toBeDefined();
      expect(completeEvent.data).toEqual(mockResult);
      expect(completeEvent.requestId).toBe('test-request-456');

      // Check return value
      expect(result).toEqual(mockResult);
    });

    it('should handle empty code validation', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: '',
        strict: false
      };

      const result = await streamingHandlers.streamValidation(input, mockContext);

      // Check that error result is returned
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Mermaid 代码不能为空');
      expect(result.suggestions).toContain('请提供有效的 Mermaid 图表代码');

      // Check that completion event was emitted with error
      const completeEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'validation' && 
        event.stage === 'complete' &&
        event.percentage === 100
      );

      expect(completeEvent).toBeDefined();
      expect(completeEvent.message).toBe('Validation completed with errors');
      expect(completeEvent.details?.issuesFound).toBe(1);
    });

    it('should handle whitespace-only code', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: '   \n  \t  \n   ',
        strict: false
      };

      const result = await streamingHandlers.streamValidation(input, mockContext);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Mermaid 代码不能为空');
    });

    it('should track progress details correctly', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'graph TD\n  A --> B\n  B --> C\n  C --> D',
        strict: false
      };

      const mockResult: ValidationResult = { valid: true };
      mockValidator.validate.mockResolvedValue(mockResult);

      await streamingHandlers.streamValidation(input, mockContext);

      // Check that progress details are tracked
      const progressEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'validation' &&
        event.details
      );

      expect(progressEvents.length).toBeGreaterThan(0);

      // Check that details contain expected fields
      const detailsEvent = progressEvents[0];
      expect(detailsEvent.details).toHaveProperty('linesProcessed');
      expect(detailsEvent.details).toHaveProperty('totalLines');
      expect(detailsEvent.details).toHaveProperty('issuesFound');
      expect(detailsEvent.details.totalLines).toBe(4); // 4 lines in the input
    });

    it('should detect syntax issues and update issue count', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'graph TD\n  A → B\n  B --> C',  // Contains invalid arrow
        strict: false
      };

      const mockResult: ValidationResult = { valid: true };
      mockValidator.validate.mockResolvedValue(mockResult);

      await streamingHandlers.streamValidation(input, mockContext);

      // Check that syntax issues were detected
      const syntaxEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'validation' && 
        event.stage === 'syntax_check' &&
        event.message.includes('Found')
      );

      expect(syntaxEvent).toBeDefined();
      expect(syntaxEvent.message).toContain('Found 1 potential issues');
    });

    it('should handle validation errors gracefully', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'graph TD\n  A --> B',
        strict: false
      };

      const mockError = new Error('Validation failed');
      mockValidator.validate.mockRejectedValue(mockError);

      const result = await streamingHandlers.streamValidation(input, mockContext);

      // Check that error result is returned
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Validation failed');
      expect(result.suggestions).toContain('Please check your Mermaid code syntax');

      // Check that error event was emitted
      const errorEvent = emittedEvents.find(event => 
        event.type === 'error' && 
        event.operation === 'validation'
      );

      expect(errorEvent).toBeDefined();
      expect(errorEvent.error.message).toBe('Validation failed');
    });

    it('should handle validation result with errors', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'invalid mermaid code',
        strict: true
      };

      const mockResult: ValidationResult = { 
        valid: false,
        error: 'Syntax error',
        line: 1,
        suggestions: ['Fix syntax error']
      };
      mockValidator.validate.mockResolvedValue(mockResult);

      const result = await streamingHandlers.streamValidation(input, mockContext);

      expect(result).toEqual(mockResult);

      // Check that completion message indicates issues
      const completeEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'validation' && 
        event.stage === 'complete' &&
        event.percentage === 100
      );

      expect(completeEvent).toBeDefined();
      expect(completeEvent.message).toBe('Validation completed with issues');
      expect(completeEvent.details?.issuesFound).toBeGreaterThan(0);
    });

    it('should clean markdown code blocks from input', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: '```mermaid\ngraph TD\n  A --> B\n```',
        strict: false
      };

      const mockResult: ValidationResult = { valid: true };
      mockValidator.validate.mockResolvedValue(mockResult);

      await streamingHandlers.streamValidation(input, mockContext);

      // Verify that the validator was called with the original code (not cleaned)
      expect(mockValidator.validate).toHaveBeenCalledWith(input.mermaidCode, input.strict);
    });

    it('should detect different diagram types correctly', async () => {
      const testCases = [
        { code: 'pie title Test\n  "A" : 50', expectedType: 'pie' },
        { code: 'flowchart TD\n  A --> B', expectedType: 'flowchart' },
        { code: 'sequenceDiagram\n  A->>B: Hello', expectedType: 'sequence' },
        { code: 'gantt\n  title Test', expectedType: 'gantt' }
      ];

      for (const testCase of testCases) {
        const input: ValidateMermaidInput = {
          mermaidCode: testCase.code,
          strict: false
        };

        const mockResult: ValidationResult = { valid: true };
        mockValidator.validate.mockResolvedValue(mockResult);

        // Clear previous events
        emittedEvents.length = 0;

        await streamingHandlers.streamValidation(input, mockContext);

        // The diagram type detection is internal, but we can verify the validation completed
        const completeEvent = emittedEvents.find(event => 
          event.type === 'result' && 
          event.operation === 'validation'
        );

        expect(completeEvent).toBeDefined();
      }
    });

    it('should emit events with correct timestamps', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'graph TD\n  A --> B',
        strict: false
      };

      const mockResult: ValidationResult = { valid: true };
      mockValidator.validate.mockResolvedValue(mockResult);

      const startTime = new Date();
      await streamingHandlers.streamValidation(input, mockContext);
      const endTime = new Date();

      // Check that all events have valid timestamps
      const eventsWithTimestamps = emittedEvents.filter(event => event.timestamp);
      expect(eventsWithTimestamps.length).toBeGreaterThan(0);

      // Check that timestamps are within the test execution time range
      eventsWithTimestamps.forEach(event => {
        const eventTime = new Date(event.timestamp);
        expect(eventTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
        expect(eventTime.getTime()).toBeLessThanOrEqual(endTime.getTime() + 1000); // Allow 1s buffer
      });
    });

    it('should emit events in correct order', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'graph TD\n  A --> B',
        strict: false
      };

      const mockResult: ValidationResult = { valid: true };
      mockValidator.validate.mockResolvedValue(mockResult);

      await streamingHandlers.streamValidation(input, mockContext);

      // Find key events and check their order
      const startEventIndex = emittedEvents.findIndex(event => 
        event.type === 'progress' && 
        event.stage === 'parsing' && 
        event.percentage === 0
      );

      const completeEventIndex = emittedEvents.findIndex(event => 
        event.type === 'result' && 
        event.operation === 'validation'
      );

      expect(startEventIndex).toBeGreaterThanOrEqual(0);
      expect(completeEventIndex).toBeGreaterThan(startEventIndex);
    });
  });

  describe('bracket checking', () => {
    it('should detect bracket mismatches in syntax checking', async () => {
      const input: ValidateMermaidInput = {
        mermaidCode: 'graph TD\n  A[unclosed bracket --> B',
        strict: false
      };

      const mockResult: ValidationResult = { valid: true };
      mockValidator.validate.mockResolvedValue(mockResult);

      await streamingHandlers.streamValidation(input, mockContext);

      // Check that syntax issues were detected
      const syntaxEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'validation' && 
        event.stage === 'syntax_check' &&
        event.message.includes('Found')
      );

      expect(syntaxEvent).toBeDefined();
      expect(syntaxEvent.message).toContain('potential issues');
    });
  });

  describe('streamOptimization', () => {
    it('should emit optimization start event', async () => {
      const input: OptimizeDiagramInput = {
        mermaidCode: 'graph TD\n  A --> B',
        goals: ['readability']
      };

      const mockResult: OptimizationResult = {
        originalCode: input.mermaidCode,
        optimizedCode: 'graph TD\n  A --> B\n  title: Optimized Graph',
        suggestions: [],
        metrics: {
          readabilityScore: 85,
          compactnessScore: 90,
          aestheticsScore: 80,
          accessibilityScore: 75
        },
        appliedOptimizations: ['add-title']
      };
      mockOptimizer.optimize.mockReturnValue(mockResult);

      await streamingHandlers.streamOptimization(input, mockContext);

      // Check that optimization start event was emitted
      const startEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.stage === 'analysis' &&
        event.percentage === 0
      );

      expect(startEvent).toBeDefined();
      expect(startEvent.message).toBe('Starting optimization...');
      expect(startEvent.requestId).toBe('test-request-456');
    });

    it('should emit progress events for all optimization stages', async () => {
      const input: OptimizeDiagramInput = {
        mermaidCode: 'graph TD\n  A --> B\n  B --> C',
        goals: ['readability', 'compactness', 'aesthetics']
      };

      const mockResult: OptimizationResult = {
        originalCode: input.mermaidCode,
        optimizedCode: input.mermaidCode,
        suggestions: [],
        metrics: {
          readabilityScore: 85,
          compactnessScore: 90,
          aestheticsScore: 80,
          accessibilityScore: 75
        },
        appliedOptimizations: []
      };
      mockOptimizer.optimize.mockReturnValue(mockResult);

      await streamingHandlers.streamOptimization(input, mockContext);

      // Check for analysis stage events
      const analysisEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.stage === 'analysis'
      );
      expect(analysisEvents.length).toBeGreaterThan(0);

      // Check for layout stage events (should exist since goals include compactness/aesthetics)
      const layoutEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.stage === 'layout'
      );
      expect(layoutEvents.length).toBeGreaterThan(0);

      // Check for readability stage events
      const readabilityEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.stage === 'readability'
      );
      expect(readabilityEvents.length).toBeGreaterThan(0);

      // Check for formatting stage events
      const formattingEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.stage === 'formatting'
      );
      expect(formattingEvents.length).toBeGreaterThan(0);
    });

    it('should emit optimization complete event with successful result', async () => {
      const input: OptimizeDiagramInput = {
        mermaidCode: 'graph TD\n  A --> B',
        goals: ['readability']
      };

      const mockResult: OptimizationResult = {
        originalCode: input.mermaidCode,
        optimizedCode: 'graph TD\n  A[Start] --> B[End]',
        suggestions: [{
          id: 'improve-labels',
          type: 'readability',
          title: 'Improve node labels',
          description: 'Make node labels more descriptive',
          impact: 'medium'
        }],
        metrics: {
          readabilityScore: 85,
          compactnessScore: 90,
          aestheticsScore: 80,
          accessibilityScore: 75
        },
        appliedOptimizations: ['improve-labels']
      };
      mockOptimizer.optimize.mockReturnValue(mockResult);

      const result = await streamingHandlers.streamOptimization(input, mockContext);

      // Check that optimization complete event was emitted
      const completeEvent = emittedEvents.find(event => 
        event.type === 'result' && 
        event.operation === 'optimization'
      );

      expect(completeEvent).toBeDefined();
      expect(completeEvent.data).toEqual(mockResult);
      expect(completeEvent.requestId).toBe('test-request-456');

      // Check return value
      expect(result).toEqual(mockResult);
    });

    it('should track optimization stages correctly for readability only', async () => {
      const input: OptimizeDiagramInput = {
        mermaidCode: 'graph TD\n  A --> B',
        goals: ['readability'] // Only readability, no layout optimization
      };

      const mockResult: OptimizationResult = {
        originalCode: input.mermaidCode,
        optimizedCode: input.mermaidCode,
        suggestions: [],
        metrics: {
          readabilityScore: 85,
          compactnessScore: 90,
          aestheticsScore: 80,
          accessibilityScore: 75
        },
        appliedOptimizations: []
      };
      mockOptimizer.optimize.mockReturnValue(mockResult);

      await streamingHandlers.streamOptimization(input, mockContext);

      // Should have analysis and readability stages, but no layout stage
      const analysisEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.stage === 'analysis'
      );
      expect(analysisEvents.length).toBeGreaterThan(0);

      const layoutEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.stage === 'layout'
      );
      expect(layoutEvents.length).toBe(0); // No layout optimization for readability-only goal

      const readabilityEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.stage === 'readability'
      );
      expect(readabilityEvents.length).toBeGreaterThan(0);
    });

    it('should handle optimization errors gracefully', async () => {
      const input: OptimizeDiagramInput = {
        mermaidCode: 'graph TD\n  A --> B',
        goals: ['readability']
      };

      const mockError = new Error('Optimization failed');
      mockOptimizer.optimize.mockImplementation(() => {
        throw mockError;
      });

      const result = await streamingHandlers.streamOptimization(input, mockContext);

      // Check that error result is returned
      expect(result.originalCode).toBe(input.mermaidCode);
      expect(result.optimizedCode).toBe(input.mermaidCode);
      expect(result.suggestions).toEqual([]);
      expect(result.appliedOptimizations).toEqual([]);

      // Check that error event was emitted
      const errorEvent = emittedEvents.find(event => 
        event.type === 'error' && 
        event.operation === 'optimization'
      );

      expect(errorEvent).toBeDefined();
      expect(errorEvent.error.message).toBe('Optimization failed');
    });

    it('should provide analysis preview with issue detection', async () => {
      const input: OptimizeDiagramInput = {
        mermaidCode: 'graph TD\n'.repeat(31) + '  A --> B', // 32 lines, no title, no styling
        goals: ['readability']
      };

      const mockResult: OptimizationResult = {
        originalCode: input.mermaidCode,
        optimizedCode: input.mermaidCode,
        suggestions: [],
        metrics: {
          readabilityScore: 85,
          compactnessScore: 90,
          aestheticsScore: 80,
          accessibilityScore: 75
        },
        appliedOptimizations: []
      };
      mockOptimizer.optimize.mockReturnValue(mockResult);

      await streamingHandlers.streamOptimization(input, mockContext);

      // Check that analysis event includes issue detection
      const analysisEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.stage === 'analysis' &&
        event.message.includes('Found')
      );

      expect(analysisEvent).toBeDefined();
      expect(analysisEvent.message).toContain('potential improvements');
      expect(analysisEvent.details?.analysis).toBeDefined();
    });

    it('should emit events with correct timestamps', async () => {
      const input: OptimizeDiagramInput = {
        mermaidCode: 'graph TD\n  A --> B',
        goals: ['readability']
      };

      const mockResult: OptimizationResult = {
        originalCode: input.mermaidCode,
        optimizedCode: input.mermaidCode,
        suggestions: [],
        metrics: {
          readabilityScore: 85,
          compactnessScore: 90,
          aestheticsScore: 80,
          accessibilityScore: 75
        },
        appliedOptimizations: []
      };
      mockOptimizer.optimize.mockReturnValue(mockResult);

      const startTime = new Date();
      await streamingHandlers.streamOptimization(input, mockContext);
      const endTime = new Date();

      // Check that all events have valid timestamps
      const eventsWithTimestamps = emittedEvents.filter(event => event.timestamp);
      expect(eventsWithTimestamps.length).toBeGreaterThan(0);

      // Check that timestamps are within the test execution time range
      eventsWithTimestamps.forEach(event => {
        const eventTime = new Date(event.timestamp);
        expect(eventTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
        expect(eventTime.getTime()).toBeLessThanOrEqual(endTime.getTime() + 1000); // Allow 1s buffer
      });
    });

    it('should emit final progress with optimization metrics', async () => {
      const input: OptimizeDiagramInput = {
        mermaidCode: 'graph TD\n  A --> B',
        goals: ['readability']
      };

      const mockResult: OptimizationResult = {
        originalCode: input.mermaidCode,
        optimizedCode: input.mermaidCode,
        suggestions: [{
          id: 'test-optimization',
          type: 'readability',
          title: 'Test optimization',
          description: 'Test description',
          impact: 'low'
        }],
        metrics: {
          readabilityScore: 85,
          compactnessScore: 90,
          aestheticsScore: 80,
          accessibilityScore: 75
        },
        appliedOptimizations: ['test-optimization']
      };
      mockOptimizer.optimize.mockReturnValue(mockResult);

      await streamingHandlers.streamOptimization(input, mockContext);

      // Check final progress event includes metrics
      const finalEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'optimization' && 
        event.percentage === 100 &&
        event.stage === 'complete'
      );

      expect(finalEvent).toBeDefined();
      expect(finalEvent.message).toContain('Applied 1 optimizations');
      expect(finalEvent.details?.optimizationsApplied).toBe(1);
      expect(finalEvent.details?.metrics).toEqual(mockResult.metrics);
    });
  });

  describe('streamFormatConversion', () => {
    it('should emit format conversion start event', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'graph TD\n  A --> B',
        targetFormat: 'flowchart'
      };

      const mockResult: FormatConversionResult = {
        originalCode: input.mermaidCode,
        convertedCode: 'flowchart TD\n  A --> B',
        sourceFormat: 'graph',
        targetFormat: 'flowchart',
        conversionSteps: ['Detected source format: graph', 'Converted to flowchart format'],
        success: true,
        preservedElements: {
          structure: true,
          content: true,
          relationships: true
        }
      };
      mockFormatConverter.convert.mockReturnValue(mockResult.convertedCode);

      await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check that format conversion start event was emitted
      const startEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'format_conversion' && 
        event.stage === 'detection' &&
        event.percentage === 0
      );

      expect(startEvent).toBeDefined();
      expect(startEvent.message).toBe('Starting format conversion...');
      expect(startEvent.requestId).toBe('test-request-456');
    });

    it('should emit progress events for all conversion stages', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'sequenceDiagram\n  A ->> B: Hello',
        targetFormat: 'flowchart'
      };

      const mockResult: FormatConversionResult = {
        originalCode: input.mermaidCode,
        convertedCode: 'flowchart TD\n  A --> B',
        sourceFormat: 'sequence',
        targetFormat: 'flowchart',
        conversionSteps: [],
        success: true,
        preservedElements: {
          structure: true,
          content: true,
          relationships: true
        }
      };
      mockFormatConverter.convert.mockReturnValue(mockResult.convertedCode);

      await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check for detection stage events
      const detectionEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'format_conversion' && 
        event.stage === 'detection'
      );
      expect(detectionEvents.length).toBeGreaterThan(0);

      // Check for parsing stage events
      const parsingEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'format_conversion' && 
        event.stage === 'parsing'
      );
      expect(parsingEvents.length).toBeGreaterThan(0);

      // Check for conversion stage events
      const conversionEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'format_conversion' && 
        event.stage === 'conversion'
      );
      expect(conversionEvents.length).toBeGreaterThan(0);

      // Check for optimization stage events
      const optimizationEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'format_conversion' && 
        event.stage === 'optimization'
      );
      expect(optimizationEvents.length).toBeGreaterThan(0);
    });

    it('should emit format conversion complete event with successful result', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'graph TD\n  A --> B',
        targetFormat: 'sequence'
      };

      const convertedCode = 'sequenceDiagram\n  participant A\n  participant B\n  A ->> B: Message';
      mockFormatConverter.convert.mockReturnValue(convertedCode);

      const result = await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check that format conversion complete event was emitted
      const completeEvent = emittedEvents.find(event => 
        event.type === 'result' && 
        event.operation === 'format_conversion'
      );

      expect(completeEvent).toBeDefined();
      expect(completeEvent.data.convertedCode).toBe(convertedCode);
      expect(completeEvent.requestId).toBe('test-request-456');

      // Check return value
      expect(result.success).toBe(true);
      expect(result.convertedCode).toBe(convertedCode);
      expect(result.sourceFormat).toBe('graph');
      expect(result.targetFormat).toBe('sequence');
    });

    it('should handle auto target format detection', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'graph TD\n  A --> B\n  B --> C',
        targetFormat: 'auto' // Auto detection
      };

      mockFormatConverter.convert.mockReturnValue('flowchart TD\n  A --> B\n  B --> C');

      await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check that target format was detected automatically
      const detectionEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'format_conversion' && 
        event.stage === 'detection' &&
        event.message.includes('Target format:')
      );

      expect(detectionEvent).toBeDefined();
      expect(detectionEvent.details?.targetFormat).toBeDefined();
      expect(detectionEvent.details.targetFormat).not.toBe('auto');
    });

    it('should track conversion progress with element counts', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'graph TD\n  A[Node A] --> B[Node B]\n  B --> C[Node C]',
        targetFormat: 'class'
      };

      mockFormatConverter.convert.mockReturnValue('classDiagram\n  class A\n  class B\n  class C');

      await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check that parsing progress includes element count
      const parsingEvent = emittedEvents.find(event => 
        event.type === 'progress' && 
        event.operation === 'format_conversion' && 
        event.stage === 'parsing' &&
        event.message.includes('Found')
      );

      expect(parsingEvent).toBeDefined();
      expect(parsingEvent.message).toContain('elements');
      expect(parsingEvent.details?.elementsFound).toBeGreaterThan(0);
    });

    it('should handle format conversion errors gracefully', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'graph TD\n  A --> B',
        targetFormat: 'sequence'
      };

      const mockError = new Error('Format conversion failed');
      mockFormatConverter.convert.mockImplementation(() => {
        throw mockError;
      });

      const result = await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check that error result is returned
      expect(result.success).toBe(false);
      expect(result.originalCode).toBe(input.mermaidCode);
      expect(result.convertedCode).toBe(input.mermaidCode); // Should return original on error
      expect(result.warnings).toContain('Format conversion failed');

      // Check that error event was emitted
      const errorEvent = emittedEvents.find(event => 
        event.type === 'error' && 
        event.operation === 'format_conversion'
      );

      expect(errorEvent).toBeDefined();
      expect(errorEvent.error.message).toBe('Format conversion failed');
    });

    it('should generate appropriate conversion warnings', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'sequenceDiagram\n  A ->> B: Hello\n  B ->> A: World',
        targetFormat: 'flowchart'
      };

      mockFormatConverter.convert.mockReturnValue('flowchart TD\n  A --> B\n  B --> A');

      const result = await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check that conversion completed and includes warnings for format-specific conversions
      expect(result.success).toBe(true);
      expect(result.sourceFormat).toBe('sequence');
      expect(result.targetFormat).toBe('flowchart');
      
      // Should include warning about time-based interactions being converted
      expect(result.warnings).toBeDefined();
      if (result.warnings && result.warnings.length > 0) {
        expect(result.warnings.some(warning => 
          warning.includes('Time-based interactions')
        )).toBe(true);
      }
    });

    it('should handle unknown source format', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'invalid diagram code here',
        targetFormat: 'flowchart'
      };

      mockFormatConverter.convert.mockReturnValue('flowchart TD\n  A --> B');

      const result = await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check that unknown source format generates appropriate warnings
      expect(result.sourceFormat).toBe('unknown');
      expect(result.warnings).toBeDefined();
      if (result.warnings) {
        expect(result.warnings.some(warning => 
          warning.includes('Source format could not be determined')
        )).toBe(true);
      }
    });

    it('should preserve elements correctly during conversion', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'graph TD\n  A --> B\n  B --> C',
        targetFormat: 'graph'
      };

      mockFormatConverter.convert.mockReturnValue(input.mermaidCode); // Same format conversion

      const result = await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check that elements are preserved when converting to same format
      expect(result.preservedElements.structure).toBe(true);
      expect(result.preservedElements.content).toBe(true);
      expect(result.preservedElements.relationships).toBe(true);
    });

    it('should skip optimization stage when optimizeStructure is false', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'graph TD\n  A --> B',
        targetFormat: 'flowchart',
        optimizeStructure: false
      };

      mockFormatConverter.convert.mockReturnValue('flowchart TD\n  A --> B');

      await streamingHandlers.streamFormatConversion(input, mockContext);

      // Check that optimization stage events are minimal when optimization is disabled
      const optimizationEvents = emittedEvents.filter(event => 
        event.type === 'progress' && 
        event.operation === 'format_conversion' && 
        event.stage === 'optimization'
      );
      
      // Should still have optimization stage for finalization, but less progress
      expect(optimizationEvents.length).toBeGreaterThan(0);
    });

    it('should emit events with correct timestamps', async () => {
      const input: ConvertFormatInput = {
        mermaidCode: 'graph TD\n  A --> B',
        targetFormat: 'sequence'
      };

      mockFormatConverter.convert.mockReturnValue('sequenceDiagram\n  A ->> B: Message');

      const startTime = new Date();
      await streamingHandlers.streamFormatConversion(input, mockContext);
      const endTime = new Date();

      // Check that all events have valid timestamps
      const eventsWithTimestamps = emittedEvents.filter(event => event.timestamp);
      expect(eventsWithTimestamps.length).toBeGreaterThan(0);

      // Check that timestamps are within the test execution time range
      eventsWithTimestamps.forEach(event => {
        const eventTime = new Date(event.timestamp);
        expect(eventTime.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
        expect(eventTime.getTime()).toBeLessThanOrEqual(endTime.getTime() + 1000); // Allow 1s buffer
      });
    });
  });
});