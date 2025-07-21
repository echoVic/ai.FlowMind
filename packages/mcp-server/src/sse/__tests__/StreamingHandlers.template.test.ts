/**
 * Unit tests for StreamingHandlers template functionality
 */

import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { TemplateManager } from '../../templates.js';
import { DiagramTemplate, GetTemplatesInput } from '../../types.js';
import { StreamingContext } from '../events.js';
import { StreamingHandlers } from '../StreamingHandlers.js';

// Mock the TemplateManager
vi.mock('../../templates.js');
vi.mock('../../validator.js');
vi.mock('../../optimizer/index.js');
vi.mock('../../optimizer/format-converter.js');

describe('StreamingHandlers - Template Generation', () => {
  let streamingHandlers: StreamingHandlers;
  let mockTemplateManager: any;
  let mockContext: StreamingContext;
  let emittedEvents: any[];

  const mockTemplates: DiagramTemplate[] = [
    {
      name: 'Simple Flowchart',
      description: 'Basic flowchart template',
      type: 'flowchart',
      useCase: 'business-process',
      complexity: 'simple',
      code: 'flowchart TD\n    A[Start] --> B[End]',
      tags: ['basic', 'flow']
    },
    {
      name: 'Complex Architecture',
      description: 'Software architecture diagram',
      type: 'flowchart',
      useCase: 'software-architecture',
      complexity: 'complex',
      code: 'flowchart TB\n    subgraph "Frontend"\n        A[Web App]\n    end',
      tags: ['architecture', 'complex']
    },
    {
      name: 'Simple Sequence',
      description: 'Basic sequence diagram',
      type: 'sequence',
      useCase: 'software-architecture',
      complexity: 'simple',
      code: 'sequenceDiagram\n    A->>B: Message',
      tags: ['sequence', 'basic']
    },
    {
      name: 'Database ER',
      description: 'Entity relationship diagram',
      type: 'er',
      useCase: 'database-design',
      complexity: 'medium',
      code: 'erDiagram\n    USER ||--o{ ORDER : places',
      tags: ['database', 'er']
    }
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    emittedEvents = [];

    // Mock TemplateManager
    mockTemplateManager = {
      getAllTemplates: vi.fn().mockReturnValue(mockTemplates),
      getTemplates: vi.fn(),
      getInstance: vi.fn()
    };

    (TemplateManager.getInstance as Mock).mockReturnValue(mockTemplateManager);

    // Create streaming handlers instance
    streamingHandlers = new StreamingHandlers();

    // Mock streaming context
    mockContext = {
      connectionId: 'test-connection-123',
      requestId: 'test-request-456',
      emit: vi.fn((data) => {
        emittedEvents.push(data);
      })
    };

    // Mock the simulateProgress method to be faster in tests
    vi.spyOn(streamingHandlers as any, 'simulateProgress').mockImplementation(() => Promise.resolve());
  });

  describe('streamTemplateGeneration', () => {
    it('should stream template generation with no filters', async () => {
      const input: GetTemplatesInput = {};

      const result = await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Verify result
      expect(result).toHaveLength(4);
      expect(result).toEqual(expect.arrayContaining(mockTemplates));

      // Verify events were emitted
      expect(emittedEvents.length).toBeGreaterThan(0);

      // Check for start event
      const startEvent = emittedEvents.find(e => e.operation === 'template' && e.percentage === 0);
      expect(startEvent).toBeDefined();
      expect(startEvent.message).toContain('Starting template processing');

      // Check for completion event
      const completeEvent = emittedEvents.find(e => e.operation === 'template' && e.percentage === 100);
      expect(completeEvent).toBeDefined();
      expect(completeEvent.message).toContain('completed successfully');

      // Verify template manager was called
      expect(mockTemplateManager.getAllTemplates).toHaveBeenCalled();
    });

    it('should filter templates by diagram type', async () => {
      const input: GetTemplatesInput = {
        diagramType: 'flowchart'
      };

      const result = await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Should return only flowchart templates
      expect(result).toHaveLength(2);
      expect(result.every(t => t.type === 'flowchart')).toBe(true);

      // Check for filtering progress events
      const filterEvent = emittedEvents.find(e => 
        e.message && e.message.includes('Filtering by diagram type: flowchart')
      );
      expect(filterEvent).toBeDefined();
    });

    it('should filter templates by use case', async () => {
      const input: GetTemplatesInput = {
        useCase: 'software-architecture'
      };

      const result = await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Should return only software-architecture templates
      expect(result).toHaveLength(2);
      expect(result.every(t => t.useCase === 'software-architecture')).toBe(true);

      // Check for filtering progress events
      const filterEvent = emittedEvents.find(e => 
        e.message && e.message.includes('Filtering by use case: software-architecture')
      );
      expect(filterEvent).toBeDefined();
    });

    it('should filter templates by complexity', async () => {
      const input: GetTemplatesInput = {
        complexity: 'simple'
      };

      const result = await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Should return only simple templates
      expect(result).toHaveLength(2);
      expect(result.every(t => t.complexity === 'simple')).toBe(true);

      // Check for filtering progress events
      const filterEvent = emittedEvents.find(e => 
        e.message && e.message.includes('Filtering by complexity: simple')
      );
      expect(filterEvent).toBeDefined();
    });

    it('should apply multiple filters', async () => {
      const input: GetTemplatesInput = {
        diagramType: 'flowchart',
        useCase: 'business-process',
        complexity: 'simple'
      };

      const result = await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Should return only templates matching all criteria
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Simple Flowchart');

      // Check that all filter stages were reported
      const filterEvents = emittedEvents.filter(e => 
        e.message && e.message.includes('Filtering by')
      );
      expect(filterEvents).toHaveLength(3);
    });

    it('should return empty array when no templates match filters', async () => {
      const input: GetTemplatesInput = {
        diagramType: 'gantt' // No gantt templates in mock data
      };

      const result = await streamingHandlers.streamTemplateGeneration(input, mockContext);

      expect(result).toHaveLength(0);

      // Should still emit completion event
      const completeEvent = emittedEvents.find(e => e.operation === 'template' && e.percentage === 100);
      expect(completeEvent).toBeDefined();
    });

    it('should emit progress events in correct order', async () => {
      const input: GetTemplatesInput = {};

      await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Extract progress events
      const progressEvents = emittedEvents.filter(e => e.type === 'progress' && e.operation === 'template');

      // Should have multiple progress events
      expect(progressEvents.length).toBeGreaterThan(5);

      // Progress should be non-decreasing
      for (let i = 1; i < progressEvents.length; i++) {
        expect(progressEvents[i].percentage).toBeGreaterThanOrEqual(progressEvents[i - 1].percentage);
      }

      // First event should be 0% or close to it
      expect(progressEvents[0].percentage).toBeLessThanOrEqual(10);

      // Last event should be 100%
      expect(progressEvents[progressEvents.length - 1].percentage).toBe(100);
    });

    it('should emit events with correct stages', async () => {
      const input: GetTemplatesInput = {};

      await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Check for all expected stages
      const stages = ['selection', 'application', 'customization', 'complete'];
      
      for (const stage of stages) {
        const stageEvent = emittedEvents.find(e => e.stage === stage);
        expect(stageEvent).toBeDefined();
      }
    });

    it('should include template processing details in progress events', async () => {
      const input: GetTemplatesInput = {};

      await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Check for events with template processing details
      const detailEvents = emittedEvents.filter(e => e.details && e.details.templatesProcessed !== undefined);
      expect(detailEvents.length).toBeGreaterThan(0);

      // Check that template counts are reasonable
      const finalDetailEvent = detailEvents[detailEvents.length - 1];
      expect(finalDetailEvent.details.templatesProcessed).toBe(4); // All mock templates
      expect(finalDetailEvent.details.totalTemplates).toBe(4);
    });

    it('should emit template complete event with result summary', async () => {
      const input: GetTemplatesInput = {};

      await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Find the complete event (result type)
      const completeEvent = emittedEvents.find(e => e.type === 'result' && e.operation === 'template');
      expect(completeEvent).toBeDefined();
      expect(completeEvent.data).toBeDefined();
      expect(completeEvent.data.templates).toHaveLength(4);
      expect(completeEvent.data.totalCount).toBe(4);
      expect(completeEvent.data.summary).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Mock template manager to throw error
      mockTemplateManager.getAllTemplates.mockImplementation(() => {
        throw new Error('Template loading failed');
      });

      const input: GetTemplatesInput = {};

      const result = await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Should return empty array on error
      expect(result).toHaveLength(0);

      // Should emit error event
      const errorEvent = emittedEvents.find(e => e.type === 'error');
      expect(errorEvent).toBeDefined();
      expect(errorEvent.error.message).toBe('Template loading failed');
    });

    it('should sort templates by complexity (simple first)', async () => {
      const input: GetTemplatesInput = {};

      const result = await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // Check that simple templates come first
      const complexityOrder = result.map(t => t.complexity);
      const simpleIndex = complexityOrder.indexOf('simple');
      const complexIndex = complexityOrder.indexOf('complex');
      
      if (simpleIndex !== -1 && complexIndex !== -1) {
        expect(simpleIndex).toBeLessThan(complexIndex);
      }
    });

    it('should generate meaningful template summary', async () => {
      const input: GetTemplatesInput = {};

      await streamingHandlers.streamTemplateGeneration(input, mockContext);

      const completeEvent = emittedEvents.find(e => e.type === 'result' && e.operation === 'template');
      const summary = completeEvent.data.summary;

      expect(summary).toContain('4 templates');
      expect(summary).toContain('flowchart');
      expect(summary).toContain('simple');
    });

    it('should emit events with correct timestamps', async () => {
      const input: GetTemplatesInput = {};

      const startTime = Date.now();
      await streamingHandlers.streamTemplateGeneration(input, mockContext);
      const endTime = Date.now();

      // All events should have timestamps within the test execution window
      emittedEvents.forEach(event => {
        if (event.timestamp) {
          const eventTime = new Date(event.timestamp).getTime();
          expect(eventTime).toBeGreaterThanOrEqual(startTime - 1000); // Allow 1s buffer
          expect(eventTime).toBeLessThanOrEqual(endTime + 1000);
        }
      });
    });

    it('should emit events with correct request and connection IDs', async () => {
      const input: GetTemplatesInput = {};

      await streamingHandlers.streamTemplateGeneration(input, mockContext);

      // All events should have correct IDs
      emittedEvents.forEach(event => {
        if (event.requestId) {
          expect(event.requestId).toBe('test-request-456');
        }
      });

      // Context emit should have been called
      expect(mockContext.emit).toHaveBeenCalled();
    });
  });

  describe('template processing helper methods', () => {
    it('should generate template summary for empty array', async () => {
      const summary = (streamingHandlers as any).generateTemplateSummary([]);
      expect(summary).toContain('No templates found');
    });

    it('should generate template summary with type and complexity counts', async () => {
      const summary = (streamingHandlers as any).generateTemplateSummary(mockTemplates);
      
      expect(summary).toContain('4 templates');
      expect(summary).toContain('2 flowchart');
      expect(summary).toContain('1 sequence');
      expect(summary).toContain('1 er');
      expect(summary).toContain('2 simple');
      expect(summary).toContain('1 medium');
      expect(summary).toContain('1 complex');
    });

    it('should optimize template order correctly', async () => {
      const optimized = (streamingHandlers as any).optimizeTemplateOrder(mockTemplates, {});
      
      // Simple templates should come before complex ones
      const simpleTemplates = optimized.filter((t: DiagramTemplate) => t.complexity === 'simple');
      const complexTemplates = optimized.filter((t: DiagramTemplate) => t.complexity === 'complex');
      
      if (simpleTemplates.length > 0 && complexTemplates.length > 0) {
        const firstSimpleIndex = optimized.indexOf(simpleTemplates[0]);
        const firstComplexIndex = optimized.indexOf(complexTemplates[0]);
        expect(firstSimpleIndex).toBeLessThan(firstComplexIndex);
      }
    });

    it('should process individual templates', async () => {
      const template = mockTemplates[0];
      const processed = await (streamingHandlers as any).processTemplate(template);
      
      // Should return the same template (for now)
      expect(processed).toEqual(template);
    });

    it('should enrich templates with metadata', async () => {
      const enriched = (streamingHandlers as any).enrichTemplatesWithMetadata(mockTemplates, {});
      
      // Should return same templates (for now, but could be extended)
      expect(enriched).toHaveLength(mockTemplates.length);
      expect(enriched[0]).toEqual(mockTemplates[0]);
    });
  });
});