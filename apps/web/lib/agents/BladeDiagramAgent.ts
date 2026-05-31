import type {
  DiagramGenerationRequest,
  DiagramGenerationResult,
} from './DiagramAgent';

type BladeProviderType = 'openai' | 'anthropic' | 'openai-compatible';

export interface BladeDiagramAgentConfig {
  apiKey: string;
  provider: 'volcengine' | 'openai' | 'anthropic' | 'qwen';
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  enableMemory?: boolean;
  endpoint?: string;
}

interface BladeProviderConfig {
  type: BladeProviderType;
  apiKey: string;
  baseUrl?: string;
}

interface BladeSessionConfig {
  provider: BladeProviderConfig;
  model: string;
}

type BladeSession = import('@blade-ai/agent-sdk').ISession;
type BladeTokenUsage = import('@blade-ai/agent-sdk').TokenUsage;

export function buildBladeProviderConfig(config: BladeDiagramAgentConfig): BladeSessionConfig {
  switch (config.provider) {
    case 'volcengine':
      return {
        provider: {
          type: 'openai-compatible',
          apiKey: config.apiKey,
          baseUrl: config.endpoint || process.env.NEXT_PUBLIC_ARK_ENDPOINT || 'https://ark.cn-beijing.volces.com/api/v3',
        },
        model: config.modelName || process.env.NEXT_PUBLIC_ARK_MODEL_NAME || 'ep-20250617131345-rshkp',
      };

    case 'qwen':
      return {
        provider: {
          type: 'openai-compatible',
          apiKey: config.apiKey,
          baseUrl: config.endpoint || process.env.NEXT_PUBLIC_QWEN_ENDPOINT || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        },
        model: config.modelName || process.env.NEXT_PUBLIC_QWEN_MODEL_NAME || 'qwen-max',
      };

    case 'anthropic':
      return {
        provider: {
          type: 'anthropic',
          apiKey: config.apiKey,
        },
        model: config.modelName || process.env.NEXT_PUBLIC_ANTHROPIC_MODEL_NAME || 'claude-3-sonnet-20240229',
      };

    case 'openai':
    default:
      return {
        provider: {
          type: config.endpoint ? 'openai-compatible' : 'openai',
          apiKey: config.apiKey,
          ...(config.endpoint ? { baseUrl: config.endpoint } : {}),
        },
        model: config.modelName || process.env.NEXT_PUBLIC_OPENAI_MODEL_NAME || 'gpt-4',
      };
  }
}

export function parseBladeDiagramResponse(
  response: string,
  request: DiagramGenerationRequest,
  metadata: { model: string; provider: string; usage?: BladeTokenUsage },
): DiagramGenerationResult {
  const parsed = parseResponsePayload(response);
  const mermaidCode = cleanMermaidCode(parsed.mermaidCode);
  const diagramType = parsed.diagramType || detectDiagramType(mermaidCode) || request.diagramType || 'flowchart';

  return {
    mermaidCode,
    explanation: parsed.explanation || '已生成图表',
    suggestions: parsed.suggestions.length > 0 ? parsed.suggestions : ['可以进一步优化图表结构'],
    diagramType,
    metadata: {
      model: metadata.model,
      provider: metadata.provider,
      usage: metadata.usage
        ? {
            totalTokens: metadata.usage.totalTokens,
            promptTokens: metadata.usage.inputTokens,
            completionTokens: metadata.usage.outputTokens,
          }
        : undefined,
    },
  };
}

export class BladeDiagramAgent {
  private readonly config: BladeDiagramAgentConfig;
  private readonly bladeConfig: BladeSessionConfig;
  private session: BladeSession | null = null;
  private conversationHistory: Array<{ role: string; content: string }> = [];
  private lastUsage: BladeTokenUsage | undefined;

  constructor(config: BladeDiagramAgentConfig) {
    this.config = config;
    this.bladeConfig = buildBladeProviderConfig(config);
  }

  async generateDiagram(
    request: DiagramGenerationRequest,
    onStream?: (chunk: string) => void,
  ): Promise<DiagramGenerationResult> {
    const prompt = buildGenerationPrompt(request);
    const session = await this.getSession();
    let response = '';

    await session.send(prompt, { maxTurns: 1 });

    for await (const event of session.stream()) {
      if (event.type === 'content' && event.delta) {
        response += event.delta;
        onStream?.(event.delta);
      } else if (event.type === 'usage') {
        this.lastUsage = event.usage;
      } else if (event.type === 'result' && event.subtype === 'success' && !response) {
        response = event.content || '';
      } else if (event.type === 'result' && event.subtype === 'error') {
        throw new Error(event.error || 'Blade Agent 生成失败');
      } else if (event.type === 'error') {
        throw new Error(event.message);
      }
    }

    const result = parseBladeDiagramResponse(response, request, {
      model: this.bladeConfig.model,
      provider: this.config.provider,
      usage: this.lastUsage,
    });

    if (this.config.enableMemory !== false) {
      this.updateConversationHistory(prompt, response);
    }

    return result;
  }

  async optimizeDiagram(mermaidCode: string, requirements: string): Promise<DiagramGenerationResult> {
    return this.generateDiagram({
      description: requirements,
      existingCode: mermaidCode,
      optimizationRequirements: requirements,
    });
  }

  clearHistory(): void {
    this.conversationHistory = [];
    if (this.session) {
      void this.session.close();
      this.session = null;
    }
  }

  setConversationHistory(history: Array<{ role: string; content: string }>): void {
    this.conversationHistory = history.slice(-20);
  }

  getConversationHistory(): Array<{ role: string; content: string }> {
    return [...this.conversationHistory];
  }

  supportsStreaming(): boolean {
    return true;
  }

  private async getSession(): Promise<BladeSession> {
    if (this.session) {
      return this.session;
    }

    const { createSession } = await import('@blade-ai/agent-sdk');
    this.session = await createSession({
      provider: this.bladeConfig.provider,
      model: this.bladeConfig.model,
      systemPrompt: buildSystemPrompt(),
      maxTurns: 1,
      persistSession: false,
      allowedTools: [],
      canUseTool: async () => ({
        behavior: 'deny',
        message: 'FlowMind diagram generation does not use tools.',
      }),
      temperature: this.config.temperature,
      outputFormat: undefined,
    } as Parameters<typeof createSession>[0]);

    return this.session;
  }

  private updateConversationHistory(userPrompt: string, response: string): void {
    this.conversationHistory.push(
      { role: 'user', content: userPrompt },
      { role: 'assistant', content: response },
    );

    if (this.conversationHistory.length > 20) {
      this.conversationHistory = this.conversationHistory.slice(-20);
    }
  }
}

function buildSystemPrompt(): string {
  return `你是专业的 Mermaid 图表生成专家。

核心规则：
1. 严格使用标准 Mermaid 语法
2. 节点ID必须符合规范：字母开头，可含字母数字下划线
3. 避免保留关键字：end, start, class, state 等，改用 endNode, startNode 等
4. 中文标签格式：nodeId[中文标签]，标签内避免换行符和特殊符号
5. 箭头前后加空格：nodeA --> nodeB

返回格式必须是严格 JSON，不要返回 Markdown：
{
  "mermaidCode": "完整的mermaid代码",
  "explanation": "简要说明",
  "suggestions": ["建议1", "建议2"],
  "diagramType": "图表类型"
}

支持类型：flowchart, sequence, class, state, er, journey, gantt, pie, quadrant, mindmap, gitgraph, kanban, architecture, packet`;
}

function buildGenerationPrompt(request: DiagramGenerationRequest): string {
  if (request.existingCode && request.optimizationRequirements) {
    return `请根据以下要求优化架构图：

当前Mermaid代码：
\`\`\`mermaid
${request.existingCode}
\`\`\`

优化要求：${request.optimizationRequirements}

请保持原有结构的基础上，根据要求进行优化改进。`;
  }

  if (request.existingCode) {
    return `请基于现有代码进行优化和扩展：

现有代码：
\`\`\`mermaid
${request.existingCode}
\`\`\`

新需求：${request.description}
建议图表类型：${request.diagramType || '自动选择最合适的类型'}

请保持原有结构的基础上，根据新需求进行优化。`;
  }

  return `请根据以下描述生成架构图：

需求描述：${request.description}
建议图表类型：${request.diagramType || '请自动选择最合适的图表类型'}

请生成清晰、专业的架构图代码。`;
}

function parseResponsePayload(response: string): {
  mermaidCode: string;
  explanation: string;
  suggestions: string[];
  diagramType?: string;
} {
  const jsonText = extractJsonObject(response);
  if (jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed.mermaidCode === 'string') {
        return {
          mermaidCode: parsed.mermaidCode,
          explanation: typeof parsed.explanation === 'string' ? parsed.explanation : '已生成图表',
          suggestions: Array.isArray(parsed.suggestions)
            ? parsed.suggestions.filter((item: unknown): item is string => typeof item === 'string')
            : [],
          diagramType: typeof parsed.diagramType === 'string' ? parsed.diagramType : undefined,
        };
      }
    } catch {
      // 继续尝试 Mermaid 代码块兜底。
    }
  }

  const mermaidMatch = response.match(/```mermaid\s*\n([\s\S]*?)\n?```/i);
  if (mermaidMatch?.[1]) {
    return {
      mermaidCode: mermaidMatch[1],
      explanation: '已生成Mermaid图表代码',
      suggestions: [],
    };
  }

  if (looksLikeMermaidCode(response)) {
    return {
      mermaidCode: response,
      explanation: '已生成Mermaid图表代码',
      suggestions: [],
    };
  }

  return {
    mermaidCode: 'flowchart TD\n    parseError[解析失败] --> retryNode[请重试]',
    explanation: '响应解析失败，已生成默认图表',
    suggestions: ['请重新生成', '尝试简化描述'],
    diagramType: 'flowchart',
  };
}

function extractJsonObject(text: string): string | null {
  const startIndex = text.indexOf('{');
  if (startIndex === -1) {
    return null;
  }

  let braceCount = 0;
  for (let index = startIndex; index < text.length; index++) {
    if (text[index] === '{') {
      braceCount += 1;
    } else if (text[index] === '}') {
      braceCount -= 1;
    }

    if (braceCount === 0) {
      return text.slice(startIndex, index + 1);
    }
  }

  return null;
}

function cleanMermaidCode(code: string): string {
  return code
    .replace(/^```mermaid\s*\n?/i, '')
    .replace(/^```\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();
}

function detectDiagramType(code: string): string {
  const trimmedCode = code.trim();
  if (trimmedCode.includes('sequenceDiagram')) return 'sequence';
  if (trimmedCode.includes('classDiagram')) return 'class';
  if (trimmedCode.includes('stateDiagram')) return 'state';
  if (trimmedCode.includes('erDiagram')) return 'er';
  if (trimmedCode.includes('gitgraph')) return 'gitgraph';
  if (trimmedCode.includes('gantt')) return 'gantt';
  if (trimmedCode.includes('pie')) return 'pie';
  if (trimmedCode.includes('journey')) return 'journey';
  if (trimmedCode.includes('mindmap')) return 'mindmap';
  if (trimmedCode.includes('flowchart') || trimmedCode.includes('graph')) return 'flowchart';
  return 'flowchart';
}

function looksLikeMermaidCode(text: string): boolean {
  return ['flowchart', 'graph', 'sequenceDiagram', 'classDiagram', '-->', '---'].some((keyword) =>
    text.includes(keyword),
  );
}
