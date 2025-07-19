// Core diagram data structures
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
  | 'entity-relationship'
  | 'user-journey'
  | 'gantt'
  | 'pie'
  | 'requirement'
  | 'gitgraph';

// AI response structures
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

// AI model configuration
export interface AIModelConfig {
  id: string;
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
  parameters?: Record<string, any>;
}

export type AIProvider = 
  | 'openai'
  | 'anthropic'
  | 'qwen'
  | 'volcengine'
  | 'custom';

// Direct call configuration
export interface DirectCallConfig {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Diagram generation request/response
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

// Optimization request/response
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

// Error types
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

// Storage and state types
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

export interface UserPreferences {
  defaultDiagramType: DiagramType;
  autoSave: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  maxHistoryItems: number;
}

// Core function return types for web app compatibility
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

export interface GenerateDiagramCoreParams {
  input: string;
  selectedModel: string;
  availableModels: AIModelConfig[];
  directCallConfig: Record<string, any>;
  currentDiagram: DiagramData;
  agentManager: any;
  ensureAgentRegistered: any;
  getProviderFromModel: any;
}

export interface OptimizeDiagramCoreParams {
  requirements: string;
  currentDiagram: DiagramData;
  selectedModel: string;
  availableModels: AIModelConfig[];
  directCallConfig: Record<string, any>;
  agentManager: any;
  ensureAgentRegistered: any;
  getProviderFromModel: any;
}

export interface ValidateConnectionCoreParams {
  selectedModel: string;
  availableModels: AIModelConfig[];
  directCallConfig: Record<string, any>;
  agentManager: any;
}

export interface ValidationResult {
  success: boolean;
  message: string;
  details?: any;
}

// Export and import types
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

// Agent and service types
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  modelConfig: AIModelConfig;
  systemPrompt?: string;
  isActive: boolean;
}

export interface AgentResponse<T = any> {
  agentId: string;
  requestId: string;
  response: AIResponse<T>;
  processingTime: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Event types for real-time updates
export interface DiagramEvent {
  type: 'generation_started' | 'generation_completed' | 'generation_failed' | 'optimization_completed';
  payload: any;
  timestamp: string;
}

// Plugin/extension specific types
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

// Main export block including AgentConfig
export type {
  DiagramData,
  DiagramType,
  AIResponse,
  DiagramGenerationResponse,
  AIModelConfig,
  AIProvider,
  DirectCallConfig,
  DiagramGenerationRequest,
  DiagramGenerationResult,
  DiagramOptimizationRequest,
  DiagramOptimizationResult,
  APIError,
  ValidationError,
  AppState,
  UserPreferences,
  CoreFunctionResult,
  GenerateDiagramCoreParams,
  OptimizeDiagramCoreParams,
  ValidateConnectionCoreParams,
  ValidationResult,
  ExportOptions,
  ImportData,
  AgentConfig,
  AgentResponse,
  DeepPartial,
  RequiredFields,
  OptionalFields,
  DiagramEvent,
  ExtensionMessage,
  ExtensionResponse
};