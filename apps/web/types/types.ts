/**
 * 共享类型定义
 * 定义前端和服务端通用的数据结构
 */

export interface DiagramData {
  id?: string;
  title: string;
  description: string;
  mermaidCode: string;
  diagramType: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'journey' | 'gantt' | 'pie' | 'quadrant' | 'mindmap' | 'gitgraph' | 'kanban' | 'architecture' | 'packet';
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AIResponse {
  mermaidCode: string;
  explanation: string;
  suggestions: string[];
  diagramType: DiagramData['diagramType'];
  metadata?: {
    model: string;
    provider: string;
    usage?: {
      totalTokens?: number;
      promptTokens?: number;
      completionTokens?: number;
    };
  };
}

interface GenerateRequest {
  description: string;
  diagramType?: DiagramData['diagramType'];
  existingCode?: string;
  modelName?: string;
  useDirectCall?: boolean;
}

interface OptimizeRequest {
  mermaidCode: string;
  requirements: string;
  modelName?: string;
  useDirectCall?: boolean;
}

export interface AIModelConfig {
  name: string;
  displayName: string;
  provider: 'openai' | 'claude' | 'volcengine' | 'qwen' | string;
  apiKey?: string;
  endpoint?: string;
  openaiCompatibleEndpoint?: string;
  model: string;
  enabled: boolean;
  description?: string;
  maxTokens?: number;
  temperature?: number;
  supportDirectCall?: boolean;
  implementationType?: 'native-fetch' | 'openai-native' | 'openai-compatible' | 'anthropic-native' | 'qwen-native' | 'custom';
  useOpenAIFormat?: boolean;
  isUsingDefaultKey?: boolean;
  icon?: string;
}

export interface DirectCallConfig {
  apiKey: string;
  endpoint?: string;
  timeout?: number;
}

interface AIServiceResponse {
  content: string;
  model: string;
  provider: string;
  usage?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
  directCall?: boolean;
}

interface ProviderConfig {
  name: string;
  displayName: string;
  icon: string;
  description: string;
  requiresApiKey: boolean;
  supportedFeatures: string[];
  defaultModels: string[];
}