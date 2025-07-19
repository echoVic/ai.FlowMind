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
  title: z.string().min(1, 'Title cannot be empty'),
  description: z.string().min(1, 'Description cannot be empty'),
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

      // Extract JSON from response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      let parsedResponse: DiagramResponse;
      try {
        parsedResponse = JSON.parse(jsonMatch[1] || '');
      } catch (parseError) {
        // Attempt to repair JSON
        const repairedJson = this.repairJson(jsonMatch[1] || '');
        parsedResponse = JSON.parse(repairedJson);
      }

      // Validate response structure
      const validatedResponse = DiagramResponseSchema.parse(parsedResponse);

      // Validate Mermaid syntax
      this.validateMermaidSyntax(validatedResponse.mermaidCode);

      return {
        success: true,
        data: validatedResponse,
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

      // Extract JSON from response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      let parsedResponse: DiagramResponse;
      try {
        parsedResponse = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (parseError) {
        // Attempt to repair JSON
        const repairedJson = this.repairJson(jsonMatch[1] || jsonMatch[0]);
        parsedResponse = JSON.parse(repairedJson);
      }

      // Validate response structure
      const validatedResponse = DiagramResponseSchema.parse(parsedResponse);

      // Validate Mermaid syntax
      this.validateMermaidSyntax(validatedResponse.mermaidCode);

      return {
        success: true,
        data: validatedResponse,
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
    const lang = language || 'English';
    const type = diagramType || 'flowchart';

    return `You are an expert in creating Mermaid diagrams. Your task is to generate a ${type} diagram based on user requirements.

Rules:
1. Return ONLY a JSON object with this exact structure: {"mermaidCode": "...", "title": "...", "description": "..."}
2. The mermaidCode must be valid Mermaid syntax for a ${type}
3. Use clear, descriptive node labels in ${lang}
4. Ensure proper diagram flow and logical connections
5. Include appropriate styling when beneficial
6. The title should be concise and descriptive
7. The description should explain the diagram's purpose and key elements

Mermaid ${type} syntax guidelines:
${this.getMermaidSyntaxGuidelines(type)}`;
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
    const trimmedCode = mermaidCode.trim();
    
    if (!trimmedCode) {
      throw new Error('Mermaid code is empty');
    }

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

    // Remove any trailing commas
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

    // Ensure proper quote escaping
    repaired = repaired.replace(/\\"/g, '\\"');

    // Fix common JSON issues
    repaired = repaired.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3'); // Quote unquoted keys
    repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"'); // Replace single quotes with double quotes

    // Ensure the JSON is properly wrapped
    if (!repaired.startsWith('{')) {
      repaired = '{' + repaired;
    }
    if (!repaired.endsWith('}')) {
      repaired = repaired + '}';
    }

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
