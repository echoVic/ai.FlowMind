/**
 * AI Agent 共享类型定义
 */

export interface AgentConfig {
  apiKey: string;
  provider: 'volcengine' | 'openai' | 'anthropic' | 'qwen';
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  enableMemory?: boolean;
  endpoint?: string;
}

export interface DiagramGenerationRequest {
  description: string;
  diagramType?: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'journey' | 'gantt' | 'pie' | 'quadrant' | 'mindmap' | 'gitgraph' | 'kanban' | 'architecture' | 'packet';
  existingCode?: string;
  optimizationRequirements?: string;
}

export interface DiagramGenerationResult {
  mermaidCode: string;
  explanation: string;
  suggestions: string[];
  diagramType: string;
  metadata: {
    model: string;
    provider: string;
    usage?: {
      totalTokens?: number;
      promptTokens?: number;
      completionTokens?: number;
    };
  };
}

export interface ManagedDiagramAgent {
  generateDiagram(request: DiagramGenerationRequest, onStream?: (chunk: string) => void): Promise<DiagramGenerationResult>;
  optimizeDiagram(mermaidCode: string, requirements: string): Promise<DiagramGenerationResult>;
  clearHistory(): void;
  getConversationHistory(): Array<{role: string, content: string}>;
  supportsStreaming(): boolean;
  setConversationHistory?: (history: Array<{role: string, content: string}>) => void;
}
