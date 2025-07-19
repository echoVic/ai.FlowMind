/**
 * @flowmind/shared-types
 * 
 * Shared type definitions for FlowMind applications.
 * This package provides common types that can be used across
 * web applications and browser extensions without creating
 * circular dependencies.
 */

// ===== Core Diagram Types =====

export interface DiagramData {
  id?: string;
  title: string;
  description?: string;
  content: string; // Mermaid diagram content
  mermaidCode: string; // Alias for content to match web app expectations
  type: DiagramType;
  diagramType: DiagramType; // Alias for type to match web app expectations
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export type DiagramType = 
  | 'flowchart'
  | 'sequence'
  | 'class'
  | 'state'
  | 'er'
  | 'journey'
  | 'gantt'
  | 'pie'
  | 'quadrant'
  | 'mindmap'
  | 'gitgraph'
  | 'kanban'
  | 'architecture'
  | 'packet';

// ===== AI Response Types =====

export interface AIResponse<T = any> {
  id: string;
  status: 'success' | 'error' | 'pending';
  message?: string;
  data?: T;
  error?: string;
  timestamp: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface DiagramGenerationResponse extends AIResponse<DiagramData> {
  data?: DiagramData;
  suggestions?: string[];
  confidence?: number;
}

// ===== AI Model Configuration =====

export interface AIModelConfig {
  id?: string; // For extension compatibility
  name: string;
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  isCustom?: boolean;
  isDefault?: boolean; // For extension compatibility
  enabled?: boolean; // For web app compatibility
  supportDirectCall?: boolean; // For web app compatibility
  isUsingDefaultKey?: boolean; // For web app compatibility
  icon?: string; // For web app compatibility
  parameters?: Record<string, any>;
}

export type AIProvider = 
  | 'openai'
  | 'anthropic'
  | 'qwen'
  | 'volcengine'
  | 'azure'
  | 'gemini'
  | 'claude'
  | 'custom';

// ===== Direct Call Configuration =====

export interface DirectCallConfig {
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  apiKey?: string; // For web app compatibility
}

// ===== Request/Response Types =====

export interface DiagramGenerationRequest {
  prompt: string;
  type?: DiagramType;
  modelConfig: AIModelConfig;
  options?: {
    includeTitle?: boolean;
    includeDescription?: boolean;
    complexity?: 'simple' | 'medium' | 'complex';
    style?: string;
  };
}

export interface DiagramGenerationResult {
  success: boolean;
  diagram?: DiagramData;
  error?: string;
  suggestions?: string[];
  metadata?: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

export interface DiagramOptimizationRequest {
  diagramContent: string;
  optimizationType: 'clarity' | 'structure' | 'performance' | 'style';
  modelConfig: AIModelConfig;
  instructions?: string;
}

export interface DiagramOptimizationResult {
  success: boolean;
  optimizedContent?: string;
  changes?: string[];
  error?: string;
}

// ===== Error Types =====

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
}

// ===== User Preferences =====

export interface UserPreferences {
  defaultDiagramType: DiagramType;
  autoSave: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  maxHistoryItems: number;
}

// ===== Storage and State Types =====

export interface AppState {
  currentDiagram?: DiagramData;
  diagramHistory: DiagramData[];
  modelConfigs: AIModelConfig[];
  selectedModelId?: string;
  isGenerating: boolean;
  isOptimizing: boolean;
  lastError?: string;
  preferences: UserPreferences;
}

// ===== Export and Import Types =====

export interface ExportOptions {
  format: 'png' | 'svg' | 'pdf' | 'mermaid' | 'json';
  quality?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export interface ImportData {
  diagrams: DiagramData[];
  modelConfigs?: AIModelConfig[];
  preferences?: Partial<UserPreferences>;
  version: string;
}

// ===== Event Types =====

export interface DiagramEvent {
  type: 'generation_started' | 'generation_completed' | 'generation_failed' | 'optimization_completed';
  payload: any;
  timestamp: string;
}

// ===== Extension/Plugin Types =====

export interface ExtensionMessage {
  type: string;
  payload: any;
  requestId?: string;
}

export interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
  requestId?: string;
}

// ===== Utility Types =====

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// ===== Core Function Types (for compatibility) =====

export interface CoreFunctionResult {
  mermaidCode: string;
  diagramType: DiagramType;
  frontendResult: any;
  metadata: {
    provider?: string;
    processingTime?: number;
    tokensUsed?: number;
    model?: string;
    [key: string]: any;
  };
}
