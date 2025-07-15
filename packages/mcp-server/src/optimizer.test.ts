import { describe, it, expect } from 'vitest';
import { DiagramOptimizer } from '../src/optimizer/index.js';

describe('DiagramOptimizer', () => {
  let optimizer: DiagramOptimizer;

  beforeEach(() => {
    optimizer = new DiagramOptimizer();
  });

  describe('optimize', () => {
    it('should optimize a simple flowchart', () => {
      const input = {
        mermaidCode: `flowchart
    A --> B
    B --> C`,
        goals: ['readability'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      const result = optimizer.optimize(input);

      expect(result).toHaveProperty('originalCode');
      expect(result).toHaveProperty('optimizedCode');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('appliedOptimizations');
      
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.metrics).toHaveProperty('readabilityScore');
      expect(result.metrics).toHaveProperty('compactnessScore');
      expect(result.metrics).toHaveProperty('aestheticsScore');
      expect(result.metrics).toHaveProperty('accessibilityScore');
    });

    it('should provide readability suggestions', () => {
      const input = {
        mermaidCode: `flowchart
    a --> b
    b --> c
    c --> d`,
        goals: ['readability'],
        preserveSemantics: true,
        maxSuggestions: 10
      };

      const result = optimizer.optimize(input);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.type === 'readability')).toBe(true);
    });

    it('should provide layout suggestions for complex diagrams', () => {
      const input = {
        mermaidCode: `flowchart
    A --> B
    A --> C
    A --> D
    A --> E
    A --> F
    B --> G
    C --> H
    D --> I
    E --> J
    F --> K`,
        goals: ['readability', 'compactness'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      const result = optimizer.optimize(input);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.type === 'layout')).toBe(true);
    });

    it('should provide accessibility suggestions', () => {
      const input = {
        mermaidCode: `flowchart TD
    A[Very long node label that might be difficult to read] --> B
    B --> C`,
        goals: ['accessibility'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      const result = optimizer.optimize(input);

      expect(result.suggestions.some(s => s.type === 'accessibility')).toBe(true);
    });

    it('should limit suggestions to maxSuggestions', () => {
      const input = {
        mermaidCode: `flowchart
    a --> b
    b --> c
    c --> d
    d --> e
    e --> f`,
        goals: ['readability', 'compactness', 'aesthetics'],
        preserveSemantics: true,
        maxSuggestions: 3
      };

      const result = optimizer.optimize(input);

      expect(result.suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should preserve semantics when requested', () => {
      const input = {
        mermaidCode: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[Other]`,
        goals: ['readability'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      const result = optimizer.optimize(input);

      // Should still be a flowchart with similar structure
      expect(result.optimizedCode).toContain('flowchart');
      expect(result.optimizedCode).toContain('A');
      expect(result.optimizedCode).toContain('B');
      expect(result.optimizedCode).toContain('C');
      expect(result.optimizedCode).toContain('D');
    });
  });

  describe('convertFormat', () => {
    it('should convert flowchart to sequence diagram', () => {
      const mermaidCode = `flowchart TD
    A[User] --> B[System]
    B --> C[Database]
    C --> B
    B --> A`;

      const result = optimizer.convertFormat(mermaidCode, 'sequence', true);

      expect(result.optimizedCode).toContain('sequenceDiagram');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].type).toBe('structure');
    });

    it('should auto-select appropriate format', () => {
      const mermaidCode = `flowchart TD
    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    F --> G`;

      const result = optimizer.convertFormat(mermaidCode, 'auto', true);

      expect(result.optimizedCode).toBeTruthy();
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should optimize structure when requested', () => {
      const mermaidCode = `flowchart
A-->B
B-->C`;

      const result = optimizer.convertFormat(mermaidCode, 'flowchart', true);

      expect(result.optimizedCode).toContain('flowchart TD');
      expect(result.optimizedCode).toContain('    A --> B');
    });

    it('should handle complex diagrams', () => {
      const mermaidCode = `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E`;

      const result = optimizer.convertFormat(mermaidCode, 'class', true);

      expect(result.optimizedCode).toContain('classDiagram');
      expect(result.metrics.readabilityScore).toBeGreaterThan(0);
    });
  });

  describe('metrics calculation', () => {
    it('should calculate readability scores correctly', () => {
      const input = {
        mermaidCode: `flowchart TD
    A[Clear Start] --> B{Good Decision}
    B -->|Yes| C[Clear Action]
    B -->|No| D[Clear Alternative]
    C --> E[Clear End]
    D --> E`,
        goals: ['readability'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      const result = optimizer.optimize(input);

      expect(result.metrics.readabilityScore).toBeGreaterThan(50);
      expect(result.metrics.readabilityScore).toBeLessThanOrEqual(100);
    });

    it('should calculate compactness scores correctly', () => {
      const input = {
        mermaidCode: `flowchart TD
    A --> B
    B --> C`,
        goals: ['compactness'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      const result = optimizer.optimize(input);

      expect(result.metrics.compactnessScore).toBeGreaterThan(0);
      expect(result.metrics.compactnessScore).toBeLessThanOrEqual(100);
    });

    it('should calculate aesthetics scores correctly', () => {
      const input = {
        mermaidCode: `flowchart TD
    A[Start] --> B[Process]
    B --> C[End]
    
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:2px`,
        goals: ['aesthetics'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      const result = optimizer.optimize(input);

      expect(result.metrics.aestheticsScore).toBeGreaterThan(0);
      expect(result.metrics.aestheticsScore).toBeLessThanOrEqual(100);
    });

    it('should calculate accessibility scores correctly', () => {
      const input = {
        mermaidCode: `flowchart TD
    title: Clear Diagram Title
    A[Start] --> B[Process]
    B --> C[End]
    
    %% This is a comment explaining the diagram`,
        goals: ['accessibility'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      const result = optimizer.optimize(input);

      expect(result.metrics.accessibilityScore).toBeGreaterThan(0);
      expect(result.metrics.accessibilityScore).toBeLessThanOrEqual(100);
    });
  });

  describe('error handling', () => {
    it('should handle empty mermaid code', () => {
      const input = {
        mermaidCode: '',
        goals: ['readability'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      expect(() => optimizer.optimize(input)).not.toThrow();
    });

    it('should handle invalid mermaid code', () => {
      const input = {
        mermaidCode: 'invalid code',
        goals: ['readability'],
        preserveSemantics: true,
        maxSuggestions: 5
      };

      expect(() => optimizer.optimize(input)).not.toThrow();
    });

    it('should handle unknown target format', () => {
      const mermaidCode = `flowchart TD
    A --> B`;

      expect(() => optimizer.convertFormat(mermaidCode, 'unknown', true)).not.toThrow();
    });
  });
});