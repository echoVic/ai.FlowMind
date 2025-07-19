import { AgentManager } from '../services/AgentManager';
import type { 
  AIModelConfig, 
  DiagramData, 
  AIResponse,
  DirectCallConfig,
  DiagramGenerationRequest,
  DiagramGenerationResult
} from '../types';

/**
 * Ensures that an AI agent is registered and ready for use
 */
export async function ensureAgentRegistered(
  modelConfig: AIModelConfig
): Promise<void> {
  try {
    const agentManager = AgentManager.getInstance();
    
    // Check if agent is already registered
    const existingAgent = agentManager.getAgent(modelConfig);
    if (existingAgent) {
      return;
    }

    // Register new agent
    agentManager.registerAgent(modelConfig);
  } catch (error) {
    console.error('Failed to register agent:', error);
    throw new Error(`Failed to register AI agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Core diagram generation logic
 */
export async function generateDiagram(
  prompt: string,
  modelConfig: AIModelConfig,
  options?: {
    temperature?: number;
    maxTokens?: number;
    retryCount?: number;
  }
): Promise<DiagramData> {
  if (!prompt.trim()) {
    throw new Error('Prompt cannot be empty');
  }

  try {
    // Ensure agent is registered
    await ensureAgentRegistered(modelConfig);

    const agentManager = AgentManager.getInstance();
    const agent = agentManager.getAgent(modelConfig);
    
    if (!agent) {
      throw new Error('Agent not found after registration');
    }

    // Generate diagram with retry logic
    const maxRetries = options?.retryCount ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await agent.generateDiagram({
          prompt,
          modelConfig,
          options: {
            includeTitle: true,
            includeDescription: true,
          }
        });

        if (result.success && result.data) {
          // Transform the result to match DiagramData interface
          return {
            id: `diagram-${Date.now()}`,
            title: result.data.title,
            description: result.data.description,
            content: result.data.mermaidCode,
            mermaidCode: result.data.mermaidCode,
            type: 'flowchart',
            diagramType: 'flowchart',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        } else {
          throw new Error(result.error || 'Generation failed without error message');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError || new Error('All generation attempts failed');
  } catch (error) {
    console.error('Diagram generation failed:', error);
    throw error instanceof Error ? error : new Error('Diagram generation failed');
  }
}

/**
 * Core diagram optimization logic
 */
export async function optimizeDiagram(
  currentDiagram: DiagramData,
  optimizationPrompt: string,
  modelConfig: AIModelConfig,
  options?: {
    temperature?: number;
    maxTokens?: number;
    retryCount?: number;
  }
): Promise<DiagramData> {
  if (!currentDiagram.content || !optimizationPrompt.trim()) {
    throw new Error('Current diagram and optimization prompt are required');
  }

  try {
    // Ensure agent is registered
    await ensureAgentRegistered(modelConfig);

    const agentManager = AgentManager.getInstance();
    const agent = agentManager.getAgent(modelConfig);
    
    if (!agent) {
      throw new Error('Agent not found after registration');
    }

    // Use the optimizeDiagram method from DiagramAgent
    const maxRetries = options?.retryCount ?? 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await agent.optimizeDiagram(currentDiagram.content, optimizationPrompt);

        if (result.success && result.data) {
          // Transform the result to match DiagramData interface
          return {
            ...currentDiagram,
            content: result.data.mermaidCode,
            mermaidCode: result.data.mermaidCode,
            title: result.data.title || currentDiagram.title,
            description: result.data.description || currentDiagram.description,
            updatedAt: new Date().toISOString()
          };
        } else {
          throw new Error(result.error || 'Optimization failed without error message');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          break;
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError || new Error('All optimization attempts failed');
  } catch (error) {
    console.error('Diagram optimization failed:', error);
    throw error instanceof Error ? error : new Error('Diagram optimization failed');
  }
}

/**
 * Validates diagram code syntax
 */
export function validateDiagramCode(code: string): { isValid: boolean; error?: string } {
  if (!code.trim()) {
    return { isValid: false, error: 'Diagram code cannot be empty' };
  }

  // Basic Mermaid syntax validation
  const trimmedCode = code.trim();
  
  // Check if it starts with a valid Mermaid diagram type
  const validDiagramTypes = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 
    'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie',
    'gitgraph', 'mindmap', 'timeline'
  ];

  const firstLine = trimmedCode.split('\n')[0].toLowerCase();
  const hasValidStart = validDiagramTypes.some(type => 
    firstLine.startsWith(type.toLowerCase())
  );

  if (!hasValidStart) {
    return { 
      isValid: false, 
      error: 'Diagram must start with a valid Mermaid diagram type' 
    };
  }

  // Check for balanced brackets and quotes
  const brackets = { '(': ')', '[': ']', '{': '}' };
  const stack: string[] = [];
  let inQuotes = false;
  let quoteChar = '';

  for (const char of trimmedCode) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (!inQuotes) {
      if (Object.keys(brackets).includes(char)) {
        stack.push(char);
      } else if (Object.values(brackets).includes(char)) {
        const lastOpen = stack.pop();
        if (!lastOpen || brackets[lastOpen as keyof typeof brackets] !== char) {
          return { isValid: false, error: 'Unmatched brackets in diagram code' };
        }
      }
    }
  }

  if (stack.length > 0) {
    return { isValid: false, error: 'Unclosed brackets in diagram code' };
  }

  if (inQuotes) {
    return { isValid: false, error: 'Unclosed quotes in diagram code' };
  }

  return { isValid: true };
}

/**
 * Fixes common issues in diagram code
 */
export function fixDiagramCode(code: string): string {
  let fixedCode = code.trim();

  // Remove markdown code block markers if present
  fixedCode = fixedCode.replace(/^```mermaid\s*\n?/, '');
  fixedCode = fixedCode.replace(/\n?```\s*$/, '');

  // Fix common spacing issues
  fixedCode = fixedCode.replace(/\s+/g, ' ');
  fixedCode = fixedCode.replace(/\s*-->\s*/g, ' --> ');
  fixedCode = fixedCode.replace(/\s*---\s*/g, ' --- ');

  // Ensure proper line breaks
  fixedCode = fixedCode.replace(/;/g, '\n');

  return fixedCode.trim();
}

/**
 * Generates example prompts for different diagram types
 */
export function getExamplePrompts(): Array<{ title: string; prompt: string; type: string }> {
  return [
    {
      title: "用户登录流程",
      prompt: "创建一个用户登录系统的流程图，包括输入验证、身份认证、错误处理和成功登录后的跳转",
      type: "flowchart"
    },
    {
      title: "电商订单处理",
      prompt: "设计一个电商平台的订单处理流程，从下单到发货的完整过程",
      type: "flowchart"
    },
    {
      title: "数据库设计",
      prompt: "为一个博客系统设计数据库结构，包括用户、文章、评论和标签的关系",
      type: "erDiagram"
    },
    {
      title: "API 调用时序",
      prompt: "展示前端调用后端API获取用户信息的时序图，包括认证和数据返回",
      type: "sequenceDiagram"
    },
    {
      title: "项目开发计划",
      prompt: "制作一个为期3个月的移动应用开发项目甘特图",
      type: "gantt"
    }
  ];
}

/**
 * Estimates the complexity of a diagram generation request
 */
export function estimateComplexity(prompt: string): 'simple' | 'medium' | 'complex' {
  const wordCount = prompt.trim().split(/\s+/).length;
  const complexKeywords = [
    'integration', 'workflow', 'architecture', 'system', 'process',
    'multiple', 'complex', 'detailed', 'comprehensive', 'advanced'
  ];
  
  const hasComplexKeywords = complexKeywords.some(keyword => 
    prompt.toLowerCase().includes(keyword)
  );

  if (wordCount < 10 && !hasComplexKeywords) {
    return 'simple';
  } else if (wordCount < 30 && !hasComplexKeywords) {
    return 'medium';
  } else {
    return 'complex';
  }
}

/**
 * Gets recommended model configuration based on complexity
 */
export function getRecommendedModelConfig(complexity: 'simple' | 'medium' | 'complex'): Partial<AIModelConfig> {
  switch (complexity) {
    case 'simple':
      return {
        temperature: 0.3,
        maxTokens: 1000,
      };
    case 'medium':
      return {
        temperature: 0.5,
        maxTokens: 2000,
      };
    case 'complex':
      return {
        temperature: 0.7,
        maxTokens: 4000,
      };
    default:
      return {
        temperature: 0.5,
        maxTokens: 2000,
      };
  }
}

/**
 * Extracts provider information from model configuration
 */
export function getProviderFromModel(modelConfig: AIModelConfig | string): string {
  if (typeof modelConfig === 'string') {
    // If it's a string, try to extract provider from model name
    const modelName = modelConfig.toLowerCase();
    if (modelName.includes('gpt') || modelName.includes('openai')) {
      return 'openai';
    } else if (modelName.includes('claude') || modelName.includes('anthropic')) {
      return 'anthropic';
    } else if (modelName.includes('gemini') || modelName.includes('google')) {
      return 'google';
    } else if (modelName.includes('llama') || modelName.includes('meta')) {
      return 'meta';
    } else if (modelName.includes('mistral')) {
      return 'mistral';
    }
    return 'unknown';
  }
  
  // If it's a model config object, return the provider field
  return modelConfig.provider || 'unknown';
}

/**
 * Core diagram generation wrapper function that matches web app API
 */
export async function generateDiagramCore(params: {
  input: string;
  selectedModel: string;
  availableModels: AIModelConfig[];
  directCallConfig: DirectCallConfig;
  currentDiagram: DiagramData;
  agentManager: any;
  ensureAgentRegistered: (config: AIModelConfig) => Promise<void>;
  getProviderFromModel: (config: AIModelConfig | string) => string;
}): Promise<{
  mermaidCode: string;
  diagramType: string;
  frontendResult: AIResponse;
  metadata: {
    provider: string;
    model: string;
    timestamp: string;
  };
}> {
  const { input, selectedModel, availableModels } = params;
  
  // Find the model configuration
  const modelConfig = availableModels.find(m => m.name === selectedModel);
  if (!modelConfig) {
    throw new Error(`Model ${selectedModel} not found in available models`);
  }

  try {
    // Generate diagram using existing function
    const result = await generateDiagram(input, modelConfig);
    
    // Transform result to match expected API
    return {
      mermaidCode: result.content || result.mermaidCode || '',
      diagramType: result.type || result.diagramType || 'flowchart',
      frontendResult: {
        content: result.content || result.mermaidCode || '',
        type: result.type || result.diagramType || 'flowchart',
        title: result.title || '',
        description: result.description || input,
        metadata: {
          provider: getProviderFromModel(modelConfig),
          model: modelConfig.model || selectedModel,
          timestamp: new Date().toISOString()
        }
      },
      metadata: {
        provider: getProviderFromModel(modelConfig),
        model: modelConfig.model || selectedModel,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('generateDiagramCore failed:', error);
    throw error;
  }
}

/**
 * Core diagram optimization wrapper function that matches web app API
 */
export async function optimizeDiagramCore(params: {
  requirements: string;
  currentDiagram: DiagramData;
  selectedModel: string;
  availableModels: AIModelConfig[];
  directCallConfig: DirectCallConfig;
  agentManager: any;
  ensureAgentRegistered: (config: AIModelConfig) => Promise<void>;
  getProviderFromModel: (config: AIModelConfig | string) => string;
}): Promise<{
  mermaidCode: string;
  diagramType: string;
  frontendResult: AIResponse;
  metadata: {
    provider: string;
    model: string;
    timestamp: string;
  };
}> {
  const { requirements, currentDiagram, selectedModel, availableModels } = params;
  
  // Find the model configuration
  const modelConfig = availableModels.find(m => m.name === selectedModel);
  if (!modelConfig) {
    throw new Error(`Model ${selectedModel} not found in available models`);
  }

  try {
    // Optimize diagram using existing function
    const result = await optimizeDiagram(currentDiagram, requirements, modelConfig);
    
    // Transform result to match expected API
    return {
      mermaidCode: result.content || result.mermaidCode || '',
      diagramType: result.type || result.diagramType || 'flowchart',
      frontendResult: {
        content: result.content || result.mermaidCode || '',
        type: result.type || result.diagramType || 'flowchart',
        title: result.title || '',
        description: result.description || requirements,
        metadata: {
          provider: getProviderFromModel(modelConfig),
          model: modelConfig.model || selectedModel,
          timestamp: new Date().toISOString()
        }
      },
      metadata: {
        provider: getProviderFromModel(modelConfig),
        model: modelConfig.model || selectedModel,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('optimizeDiagramCore failed:', error);
    throw error;
  }
}

/**
 * Core connection validation function that matches web app API
 */
export async function validateConnectionCore(params: {
  selectedModel: string;
  availableModels: AIModelConfig[];
  directCallConfig: DirectCallConfig;
  agentManager: any;
}): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const { selectedModel, availableModels, directCallConfig, agentManager } = params;
  
  try {
    // Find the model configuration
    const modelConfig = availableModels.find(m => m.name === selectedModel);
    if (!modelConfig) {
      return {
        success: false,
        message: `Model ${selectedModel} not found in available models`
      };
    }

    // Check if provider config exists
    const providerConfig = directCallConfig[modelConfig.provider];
    if (!providerConfig || !providerConfig.apiKey) {
      return {
        success: false,
        message: `API key not configured for provider ${modelConfig.provider}`
      };
    }

    // Try to ensure agent is registered
    await ensureAgentRegistered(modelConfig);
    
    // Check if agent is available
    const agent = agentManager.getAgent(modelConfig);
    if (!agent) {
      return {
        success: false,
        message: 'Agent registration failed'
      };
    }

    // Try a simple test generation
    try {
      const testResult = await generateDiagram('Simple test diagram', modelConfig, {
        temperature: 0.1,
        maxTokens: 100,
        retryCount: 1
      });
      
      return {
        success: true,
        message: `Connection to ${modelConfig.provider} (${modelConfig.model}) validated successfully`,
        details: {
          provider: modelConfig.provider,
          model: modelConfig.model,
          testResult: testResult ? 'Generated test diagram' : 'No result'
        }
      };
    } catch (testError) {
      return {
        success: false,
        message: `Connection test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`,
        details: {
          provider: modelConfig.provider,
          model: modelConfig.model,
          error: testError instanceof Error ? testError.message : 'Unknown error'
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}
