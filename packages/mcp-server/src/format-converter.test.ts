import { describe, it, expect } from 'vitest';
import { FormatConverter } from '../src/optimizer/format-converter.js';

describe('FormatConverter', () => {
  let converter: FormatConverter;

  beforeEach(() => {
    converter = new FormatConverter();
  });

  describe('flowchart conversion', () => {
    it('should convert flowchart to sequence diagram', () => {
      const flowchartCode = `flowchart TD
    A[User] --> B[System]
    B --> C[Database]
    C --> B
    B --> A`;

      const result = converter.convert(flowchartCode, 'sequence', true);

      expect(result).toContain('sequenceDiagram');
      expect(result).toContain('participant');
      expect(result).toContain('->');
    });

    it('should convert flowchart to class diagram', () => {
      const flowchartCode = `flowchart TD
    A[User] --> B[Order]
    B --> C[Product]`;

      const result = converter.convert(flowchartCode, 'class', true);

      expect(result).toContain('classDiagram');
      expect(result).toContain('class');
      expect(result).toContain('-->');
    });

    it('should convert flowchart to ER diagram', () => {
      const flowchartCode = `flowchart TD
    A[User] --> B[Order]
    B --> C[Product]`;

      const result = converter.convert(flowchartCode, 'er', true);

      expect(result).toContain('erDiagram');
      expect(result).toContain('{');
      expect(result).toContain('||--||');
    });

    it('should convert flowchart to mindmap', () => {
      const flowchartCode = `flowchart TD
    A[Root] --> B[Branch1]
    A --> C[Branch2]
    B --> D[Leaf1]
    B --> E[Leaf2]`;

      const result = converter.convert(flowchartCode, 'mindmap', true);

      expect(result).toContain('mindmap');
      expect(result.split('\n').length).toBeGreaterThan(2);
    });
  });

  describe('sequence diagram conversion', () => {
    it('should convert sequence to flowchart', () => {
      const sequenceCode = `sequenceDiagram
    participant A as User
    participant B as System
    A->>B: Request
    B-->>A: Response`;

      const result = converter.convert(sequenceCode, 'flowchart', true);

      expect(result).toContain('flowchart TD');
      expect(result).toContain('-->');
    });

    it('should maintain sequence structure when same format', () => {
      const sequenceCode = `sequenceDiagram
    participant A as User
    participant B as System
    A->>B: Request
    B-->>A: Response`;

      const result = converter.convert(sequenceCode, 'sequence', true);

      expect(result).toContain('sequenceDiagram');
      expect(result).toContain('participant');
      expect(result).toContain('->>');
    });
  });

  describe('class diagram conversion', () => {
    it('should convert class to flowchart', () => {
      const classCode = `classDiagram
    class User {
        +String name
        +login()
    }
    class Order {
        +String id
        +calculate()
    }
    User --> Order`;

      const result = converter.convert(classCode, 'flowchart', true);

      expect(result).toContain('flowchart TD');
      expect(result).toContain('-->');
    });

    it('should maintain class structure when same format', () => {
      const classCode = `classDiagram
    class User {
        +String name
        +login()
    }
    class Order {
        +String id
        +calculate()
    }
    User --> Order`;

      const result = converter.convert(classCode, 'class', true);

      expect(result).toContain('classDiagram');
      expect(result).toContain('class');
      expect(result).toContain('{');
    });
  });

  describe('ER diagram conversion', () => {
    it('should convert ER to flowchart', () => {
      const erCode = `erDiagram
    USER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        int user_id FK
        decimal amount
    }
    USER ||--o{ ORDER : places`;

      const result = converter.convert(erCode, 'flowchart', true);

      expect(result).toContain('flowchart TD');
      expect(result).toContain('-->');
    });

    it('should maintain ER structure when same format', () => {
      const erCode = `erDiagram
    USER {
        int id PK
        string name
        string email
    }
    ORDER {
        int id PK
        int user_id FK
        decimal amount
    }
    USER ||--o{ ORDER : places`;

      const result = converter.convert(erCode, 'er', true);

      expect(result).toContain('erDiagram');
      expect(result).toContain('{');
      expect(result).toContain('||--');
    });
  });

  describe('structure optimization', () => {
    it('should add proper indentation', () => {
      const unformattedCode = `flowchart TD
A-->B
B-->C`;

      const result = converter.convert(unformattedCode, 'flowchart', true);

      expect(result).toContain('    A --> B');
      expect(result).toContain('    B --> C');
    });

    it('should add direction declaration', () => {
      const flowchartCode = `flowchart
    A --> B
    B --> C`;

      const result = converter.convert(flowchartCode, 'flowchart', true);

      expect(result).toContain('flowchart TD');
    });

    it('should standardize spacing', () => {
      const messyCode = `flowchart TD
    A   -->    B
    B-->C`;

      const result = converter.convert(messyCode, 'flowchart', true);

      expect(result).toContain('A --> B');
      expect(result).toContain('B --> C');
    });

    it('should remove empty lines', () => {
      const codeWithEmptyLines = `flowchart TD

    A --> B

    B --> C

`;

      const result = converter.convert(codeWithEmptyLines, 'flowchart', true);

      expect(result).not.toContain('\n\n');
    });
  });

  describe('sequence diagram optimization', () => {
    it('should organize participants before messages', () => {
      const messySequence = `sequenceDiagram
    A->>B: Message 1
    participant A as User
    B-->>A: Response 1
    participant B as System
    A->>B: Message 2`;

      const result = converter.convert(messySequence, 'sequence', true);

      const lines = result.split('\n');
      const participantLines = lines.filter(line => line.includes('participant'));
      const messageLines = lines.filter(line => line.includes('->>') || line.includes('-->>'));

      expect(participantLines.length).toBeGreaterThan(0);
      expect(messageLines.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle empty code', () => {
      expect(() => converter.convert('', 'flowchart', true)).not.toThrow();
    });

    it('should handle invalid code', () => {
      expect(() => converter.convert('invalid code', 'flowchart', true)).not.toThrow();
    });

    it('should handle unknown source format', () => {
      const unknownCode = `unknownDiagram
    A --> B`;

      expect(() => converter.convert(unknownCode, 'flowchart', true)).not.toThrow();
    });

    it('should handle unknown target format', () => {
      const flowchartCode = `flowchart TD
    A --> B`;

      expect(() => converter.convert(flowchartCode, 'unknown', true)).not.toThrow();
    });
  });

  describe('format detection', () => {
    it('should detect flowchart format', () => {
      const flowchartCode = `flowchart TD
    A --> B`;

      const result = converter.convert(flowchartCode, 'flowchart', false);

      expect(result).toContain('flowchart TD');
    });

    it('should detect sequence format', () => {
      const sequenceCode = `sequenceDiagram
    A->>B: Message`;

      const result = converter.convert(sequenceCode, 'sequence', false);

      expect(result).toContain('sequenceDiagram');
    });

    it('should detect class format', () => {
      const classCode = `classDiagram
    class User`;

      const result = converter.convert(classCode, 'class', false);

      expect(result).toContain('classDiagram');
    });

    it('should detect ER format', () => {
      const erCode = `erDiagram
    USER {
        int id
    }`;

      const result = converter.convert(erCode, 'er', false);

      expect(result).toContain('erDiagram');
    });
  });
});