import { ChatAnthropic } from '@langchain/anthropic';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// Types for diagram generation
export interface DiagramGenerationRequest {
  prompt: string;
  diagramType?: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'journey' | 'gantt' | 'pie' | 'quadrant' | 'mindmap' | 'gitgraph' | 'kanban' | 'architecture' | 'packet';
  modelConfig: AIModelConfig;
  language?: string;
}

export interface DiagramGenerationResult {
  success: boolean;
  data?: {
    mermaidCode: string;
    title: string;
    description: string;
  };
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | undefined;
}

export interface AIModelConfig {
  provider: 'openai' | 'anthropic' | 'qwen' | 'volcengine';
  model: string;
  apiKey: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

// Validation schema for AI response
const DiagramResponseSchema = z.object({
  mermaidCode: z.string().min(1, 'Mermaid code cannot be empty'),
  explanation: z.string().min(1, 'Explanation cannot be empty'),
  suggestions: z.array(z.string()),
  diagramType: z.string().min(1, 'Diagram type cannot be empty'),
});

type DiagramResponse = z.infer<typeof DiagramResponseSchema>;

export class DiagramAgent {
  private llm: BaseLanguageModel;
  private modelConfig: AIModelConfig;

  constructor(modelConfig: AIModelConfig) {
    this.modelConfig = modelConfig;
    this.llm = this.createLLMInstance(modelConfig);
  }

  private createLLMInstance(config: AIModelConfig): BaseLanguageModel {
    switch (config.provider) {
      case 'openai':
        return new ChatOpenAI({
          apiKey: config.apiKey,
          modelName: config.model,
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens ?? 2048,
          ...(config.baseURL && { configuration: { baseURL: config.baseURL } }),
        });

      case 'anthropic':
        return new ChatAnthropic({
          apiKey: config.apiKey,
          modelName: config.model,
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens ?? 2048,
          ...(config.baseURL && { clientOptions: { baseURL: config.baseURL } }),
        });

      case 'qwen':
        return new ChatOpenAI({
          apiKey: config.apiKey,
          modelName: config.model,
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens ?? 2048,
          configuration: {
            baseURL: config.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
          },
        });

      case 'volcengine':
        return new ChatOpenAI({
          apiKey: config.apiKey,
          modelName: config.model,
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens ?? 2048,
          configuration: {
            baseURL: config.baseURL || 'https://ark.cn-beijing.volces.com/api/v3',
          },
        });

      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  async generateDiagram(request: DiagramGenerationRequest): Promise<DiagramGenerationResult> {
    try {
      const systemPrompt = this.buildSystemPrompt(request.diagramType, request.language);
      const userPrompt = this.buildUserPrompt(request.prompt, request.diagramType);

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const response = await this.llm.invoke(messages);
      const content = response.content as string;

      // Extract JSON from response - try multiple formats
      let jsonContent = '';
      
      // First try to find JSON in code blocks
      const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonContent = jsonBlockMatch[1] || '';
      } else {
        // If no code block, try to find JSON object directly
        const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonContent = jsonObjectMatch[0];
        } else {
          throw new Error('No JSON found in AI response');
        }
      }

      const parsedResponse = this.parseJsonResponse(jsonContent);

      // Validate response structure
      const validatedResponse = DiagramResponseSchema.parse(parsedResponse);

      // Validate Mermaid syntax
      this.validateMermaidSyntax(validatedResponse.mermaidCode);

      return {
        success: true,
        data: {
          mermaidCode: this.cleanMermaidCode(validatedResponse.mermaidCode),
          title: validatedResponse.suggestions.join(', '),
          description: validatedResponse.explanation,
        },
        usage: this.extractUsageInfo(response),
      };
    } catch (error) {
      console.error('Diagram generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async optimizeDiagram(mermaidCode: string, optimizationGoal: string): Promise<DiagramGenerationResult> {
    try {
      const systemPrompt = `You are an expert in Mermaid diagram optimization. Your task is to improve the given Mermaid diagram based on the optimization goal while maintaining its core functionality and meaning.

Rules:
1. Return ONLY a JSON object with the structure: {"mermaidCode": "...", "title": "...", "description": "..."}
2. Ensure the optimized Mermaid code is syntactically correct
3. Maintain the original diagram's logical flow and relationships
4. Apply the requested optimization while preserving clarity
5. Use proper Mermaid syntax and formatting`;

      const userPrompt = `Optimize this Mermaid diagram:

\`\`\`mermaid
${mermaidCode}
\`\`\`

Optimization goal: ${optimizationGoal}

Please provide the optimized version following the JSON format specified.`;

      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ];

      const response = await this.llm.invoke(messages);
      const content = response.content as string;

      // Extract JSON from response - try multiple formats
      let jsonContent = '';
      
      // First try to find JSON in code blocks
      const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonContent = jsonBlockMatch[1] || '';
      } else {
        // If no code block, try to find JSON object directly
        const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
        if (jsonObjectMatch) {
          jsonContent = jsonObjectMatch[0];
        } else {
          throw new Error('No JSON found in AI response');
        }
      }

      const parsedResponse = this.parseJsonResponse(jsonContent);

      // Validate response structure
      const validatedResponse = DiagramResponseSchema.parse(parsedResponse);

      // Validate Mermaid syntax
      this.validateMermaidSyntax(validatedResponse.mermaidCode);

      return {
        success: true,
        data: {
          mermaidCode: this.cleanMermaidCode(validatedResponse.mermaidCode),
          title: validatedResponse.suggestions.join(', '),
          description: validatedResponse.explanation,
        },
        usage: this.extractUsageInfo(response),
      };
    } catch (error) {
      console.error('Diagram optimization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private buildSystemPrompt(diagramType?: string, language?: string): string {
    const lang = language || '中文';
    const type = diagramType || 'flowchart';

    return `你是一个专业的架构图生成专家。请根据用户的描述生成高质量的Mermaid代码。

生成规则：
1. 严格按照Mermaid语法规范生成代码
2. 根据描述选择最合适的图表类型
3. 节点命名要清晰、有意义
4. 连接关系要符合逻辑
5. 代码结构要清晰易读

支持的图表类型：
- flowchart: 流程图 (推荐用于业务流程、系统架构)
- sequence: 时序图 (推荐用于交互流程、API调用)
- class: 类图 (推荐用于系统设计、数据结构)
- state: 状态图 (推荐用于对象生命周期、协议状态机)
- er: 实体关系图 (推荐用于数据库设计)
- journey: 用户旅程图 (推荐用于用户体验设计)
- gantt: 甘特图 (推荐用于项目计划、时间安排)
- pie: 饼图 (推荐用于数据统计、比例展示)
- quadrant: 四象限图 (推荐用于战略分析、优先级排序)
- mindmap: 思维导图 (推荐用于头脑风暴、知识整理)
- gitgraph: Git分支图 (推荐用于版本管理流程)
- kanban: 看板图 (推荐用于任务管理、敏捷开发)
- architecture: 架构图 (C4风格，推荐用于复杂系统架构展示)
- packet: 数据包图 (推荐用于网络协议分析)

请严格按照以下JSON格式返回：
{
  "mermaidCode": "这里是生成的mermaid代码",
  "explanation": "简要说明代码的功能和结构",
  "suggestions": ["优化建议1", "优化建议2"],
  "diagramType": "图表类型"
}`;
  }

  private buildUserPrompt(prompt: string, diagramType?: string): string {
    const type = diagramType || 'flowchart';
    return `Create a ${type} diagram for: ${prompt}

Please analyze the requirements and generate an appropriate Mermaid diagram that clearly represents the described process, system, or concept.`;
  }

  private getMermaidSyntaxGuidelines(type: string): string {
    const guidelines: Record<string, string> = {
      flowchart: `
- Start with: flowchart TD (top-down) or flowchart LR (left-right)
- Nodes: A[Rectangle], B(Rounded), C{Diamond}, D((Circle))
- Connections: A --> B, A -.-> B (dotted), A ==> B (thick)
- Labels: A -->|label| B`,
      
      sequence: `
- Participants: participant A, participant B
- Messages: A->>B: message, A-->>B: async message
- Activation: activate A, deactivate A
- Notes: Note over A: note text`,
      
      class: `
- Classes: class Animal, class Dog
- Relationships: Animal <|-- Dog (inheritance), Animal --> Dog (association)
- Members: class Animal { +name: string +move() }`,
      
      state: `
- States: state "State Name" as s1
- Transitions: s1 --> s2: event
- Start/End: [*] --> s1, s1 --> [*]`,
      
      er: `
- Entities: entity "Entity Name" as e1
- Relationships: e1 ||--o{ e2 : relationship
- Attributes: e1 { +attribute1: type +attribute2: type }`,
      
      journey: `
- Title: journey, title User Journey
- Sections: section Phase 1
- Tasks: Task 1: 5: User, Task 2: 3: System`,
      
      gantt: `
- Title: gantt, title Project Timeline
- Sections: section Development
- Tasks: Task 1: done, task1, 2024-01-01, 2024-01-15`,
      
      pie: `
- Title: pie title Chart Title
- Data: "Label 1": 42.96, "Label 2": 50.05`,
      
      quadrant: `
- Title: quadrantChart, title Quadrant Chart
- Axes: x-axis Low --> High, y-axis Low --> High
- Points: Q1: [0.3, 0.6]`,
      
      mindmap: `
- Root: mindmap, root((Root))
- Branches: A, B, C
- Sub-branches: A --> A1, A --> A2`,
      
      gitgraph: `
- Commit: commit id: "commit message"
- Branch: branch feature, checkout feature
- Merge: checkout main, merge feature`,
      
      kanban: `
- Title: kanban, title Kanban Board
- Columns: To Do, In Progress, Done
- Cards: Add card "Task 1" to "To Do"`,
      
      architecture: `
- Use flowchart with architectural components
- Start with: flowchart TD
- Components: A[Component], B[Service], C[Database]
- Connections: A --> B, B --> C`,
      
      packet: `
- Use sequence diagram for packet flow
- Start with: sequenceDiagram
- Participants: Client, Server, Database
- Messages: Client->>Server: Request, Server->>Database: Query`,
    };

    return guidelines[type] || guidelines.flowchart || '';
  }

  private validateMermaidSyntax(mermaidCode: string): void {
    // Basic syntax validation
    let trimmedCode = mermaidCode.trim();
    
    if (!trimmedCode) {
      throw new Error('Mermaid code is empty');
    }

    // 移除可能的代码块标记
    trimmedCode = trimmedCode
      .replace(/^```mermaid\s*\n?/i, '')  // 移除开头的 ```mermaid
      .replace(/^```\s*\n?/i, '')        // 移除开头的 ```
      .replace(/\n?```\s*$/i, '')        // 移除结尾的 ```
      .trim();                           // 移除前后空白

    // Check for basic Mermaid diagram types
    const validStarters = [
      'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
      'stateDiagram', 'gantt', 'pie', 'gitgraph', 'journey',
      'erDiagram', 'mindmap', 'timeline'
    ];

    const hasValidStarter = validStarters.some(starter => 
      trimmedCode.toLowerCase().startsWith(starter.toLowerCase())
    );

    if (!hasValidStarter) {
      throw new Error('Invalid Mermaid diagram type or syntax');
    }

    // Check for balanced brackets and parentheses
    const brackets = { '[': ']', '(': ')', '{': '}' };
    const stack: string[] = [];
    
    for (const char of trimmedCode) {
      if (Object.keys(brackets).includes(char)) {
        stack.push(char);
      } else if (Object.values(brackets).includes(char)) {
        const lastOpen = stack.pop();
        if (!lastOpen || brackets[lastOpen as keyof typeof brackets] !== char) {
          throw new Error('Unbalanced brackets in Mermaid code');
        }
      }
    }

    if (stack.length > 0) {
      throw new Error('Unclosed brackets in Mermaid code');
    }
  }

  private repairJson(jsonString: string): string {
    let repaired = jsonString.trim();

    // 方法1：尝试更简单的修复方法
    // 首先尝试简单地转义未转义的换行符
    let fixed = repaired
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
    
    // 测试是否能解析
    try {
      JSON.parse(fixed);
      return fixed;
    } catch (error) {
      console.log('DiagramAgent: 简单修复失败，尝试更复杂的修复');
    }
    
    // 方法2：更彻底的修复
    try {
      // 提取mermaidCode字段的值并单独处理
      const mermaidCodeMatch = repaired.match(/"mermaidCode"\s*:\s*"([^"]*(?:\\.[^"]*)*)"(?=\s*,|\s*})/);
      if (mermaidCodeMatch && mermaidCodeMatch[1]) {
        const originalValue = mermaidCodeMatch[1];
        // 正确转义Mermaid代码中的特殊字符
        const escapedValue = originalValue
          .replace(/\\/g, '\\\\')  // 转义反斜杠
          .replace(/"/g, '\\"')    // 转义双引号
          .replace(/\n/g, '\\n')   // 转义换行符
          .replace(/\r/g, '\\r')   // 转义回车符
          .replace(/\t/g, '\\t');  // 转义制表符
        
        // 替换原始值
        const fixedJson = repaired.replace(mermaidCodeMatch[0], `"mermaidCode": "${escapedValue}"`);
        
        // 测试解析
        JSON.parse(fixedJson);
        return fixedJson;
      }
    } catch (error2) {
      console.log('DiagramAgent: 复杂修复也失败');
    }
    
    // 方法3：最后的兜底方案 - 尝试重新构建JSON
    try {
      // 提取字段值（使用更宽松的匹配）
      const mermaidCodeMatch = repaired.match(/"mermaidCode"\s*:\s*"([\s\S]*?)(?=",\s*"explanation"|"})/);
      const explanationMatch = repaired.match(/"explanation"\s*:\s*"([^"]*(?:\\.[^"]*)*)"(?=\s*,|\s*})/);
      const suggestionsMatch = repaired.match(/"suggestions"\s*:\s*\[([\s\S]*?)\](?=\s*,|\s*})/);
      const diagramTypeMatch = repaired.match(/"diagramType"\s*:\s*"([^"]*)"(?=\s*,|\s*})/);
      
      if (mermaidCodeMatch && explanationMatch && diagramTypeMatch) {
        // 重新构建JSON
        const cleanedJson = {
          mermaidCode: mermaidCodeMatch[1],
          explanation: explanationMatch[1],
          suggestions: suggestionsMatch ? JSON.parse(`[${suggestionsMatch[1]}]`) : [],
          diagramType: diagramTypeMatch[1]
        };
        
        return JSON.stringify(cleanedJson);
      }
    } catch (error3) {
      console.log('DiagramAgent: 重构JSON也失败');
    }
    
    // 如果所有方法都失败，返回原始字符串
    return repaired;
  }

  private parseJsonResponse(jsonContent: string): DiagramResponse {
    try {
      const parsed = JSON.parse(jsonContent);
      
      // Handle nested response structure (like OpenAI/Anthropic format)
      if (parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content) {
        // Extract the inner content which contains the actual diagram JSON
        const innerContent = parsed.choices[0].message.content;
        return this.parseInnerContent(innerContent);
      } else {
        // Direct response format
        return parsed;
      }
    } catch (parseError) {
      // If the outer JSON fails, try to parse as direct JSON
      try {
        return this.parseInnerContent(jsonContent);
      } catch (innerError) {
        const errorMessage = innerError instanceof Error ? innerError.message : String(innerError);
        throw new Error(`Failed to parse JSON: ${errorMessage}`);
      }
    }
  }

  private parseInnerContent(content: string): DiagramResponse {
    // First, try to find JSON in code blocks
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      const jsonStr = jsonBlockMatch[1] || '';
      return this.parseJsonString(jsonStr);
    }
    
    // Then try to find JSON object directly
    const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      return this.parseJsonString(jsonObjectMatch[0]);
    }
    
    throw new Error('No diagram JSON found in content');
  }

  private parseJsonString(jsonStr: string): DiagramResponse {
    try {
      // Clean up the JSON string to handle unescaped newlines and quotes
      let cleaned = jsonStr.trim();
      
      // Handle unescaped newlines in string literals
      cleaned = cleaned.replace(/\\n/g, '\\n');
      cleaned = cleaned.replace(/\\r/g, '\\r');
      cleaned = cleaned.replace(/\\t/g, '\\t');
      
      // Handle actual newlines in JSON strings
      cleaned = cleaned.replace(/\n/g, '\\n');
      cleaned = cleaned.replace(/\r/g, '\\r');
      cleaned = cleaned.replace(/\t/g, '\\t');

      // Handle unescaped quotes
      cleaned = cleaned.replace(/\\"/g, '\\"');
      
      // Fix common JSON issues
      cleaned = this.repairJson(cleaned);
      
      return JSON.parse(cleaned);
    } catch (error) {
      // If parsing still fails, try a more aggressive repair
      const aggressivelyRepaired = this.aggressiveJsonRepair(jsonStr);
      return JSON.parse(aggressivelyRepaired);
    }
  }

  private aggressiveJsonRepair(jsonStr: string): string {
    let repaired = jsonStr.trim();
    
    // Handle unescaped newlines and quotes more aggressively
    repaired = repaired.replace(/(["'])\s*\n\s*(["'])/g, '$1\\n$2');
    repaired = repaired.replace(/(["'])\s*\r\s*(["'])/g, '$1\\r$2');
    repaired = repaired.replace(/(["'])\s*\t\s*(["'])/g, '$1\\t$2');
    
    // Ensure proper escaping
    repaired = repaired.replace(/([^\\])"/g, '$1\\"');
    
    return repaired;
  }

  private extractUsageInfo(response: any): { promptTokens: number; completionTokens: number; totalTokens: number } | undefined {
    // Extract token usage information if available
    const usage = response.response_metadata?.usage || response.usage;
    
    if (usage) {
      return {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      };
    }

    return undefined;
  }

  private cleanMermaidCode(mermaidCode: string): string {
    let cleaned = mermaidCode.trim();
    
    // 移除可能的代码块标记
    cleaned = cleaned
      .replace(/^```mermaid\s*\n?/i, '')  // 移除开头的 ```mermaid
      .replace(/^```\s*\n?/i, '')        // 移除开头的 ```
      .replace(/\n?```\s*$/i, '')        // 移除结尾的 ```
      .trim();                           // 移除前后空白
    
    return cleaned;
  }
}

// Factory class for creating DiagramAgent instances
export class DiagramAgentFactory {
  static create(modelConfig: AIModelConfig): DiagramAgent {
    return new DiagramAgent(modelConfig);
  }

  static validateConfig(config: AIModelConfig): boolean {
    const requiredFields = ['provider', 'model', 'apiKey'];
    return requiredFields.every(field => config[field as keyof AIModelConfig]);
  }

  static getSupportedProviders(): string[] {
    return ['openai', 'anthropic', 'qwen', 'volcengine'];
  }

  static getDefaultModels(): Record<string, string[]> {
    return {
      openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      anthropic: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      qwen: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
      volcengine: ['doubao-pro-4k', 'doubao-lite-4k'],
    };
  }
}

// Export types for external use
export type {
  DiagramResponse
};

