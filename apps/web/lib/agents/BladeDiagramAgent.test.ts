import { describe, expect, it } from 'vitest';
import { buildBladeProviderConfig, parseBladeDiagramResponse } from './BladeDiagramAgent';

describe('buildBladeProviderConfig', () => {
  it('maps Volcengine Ark to an OpenAI-compatible Blade provider', () => {
    const config = buildBladeProviderConfig({
      apiKey: 'ark-key',
      provider: 'volcengine',
      modelName: 'ep-20250617131345-rshkp',
      endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
    });

    expect(config).toEqual({
      provider: {
        type: 'openai-compatible',
        apiKey: 'ark-key',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      },
      model: 'ep-20250617131345-rshkp',
    });
  });

  it('maps Anthropic to the native Blade provider', () => {
    const config = buildBladeProviderConfig({
      apiKey: 'anthropic-key',
      provider: 'anthropic',
      modelName: 'claude-3-sonnet-20240229',
    });

    expect(config.provider.type).toBe('anthropic');
    expect(config.model).toBe('claude-3-sonnet-20240229');
  });
});

describe('parseBladeDiagramResponse', () => {
  it('parses strict JSON and removes Mermaid fences', () => {
    const result = parseBladeDiagramResponse(
      JSON.stringify({
        mermaidCode: '```mermaid\nflowchart TD\n    startNode[开始] --> endNode[结束]\n```',
        explanation: '登录流程图',
        suggestions: ['补充异常分支'],
        diagramType: 'flowchart',
      }),
      { description: '登录流程', diagramType: 'flowchart' },
      { model: 'ep-model', provider: 'volcengine' },
    );

    expect(result).toMatchObject({
      mermaidCode: 'flowchart TD\n    startNode[开始] --> endNode[结束]',
      explanation: '登录流程图',
      suggestions: ['补充异常分支'],
      diagramType: 'flowchart',
    });
  });

  it('falls back to a Mermaid code block when JSON is not present', () => {
    const result = parseBladeDiagramResponse(
      '这是图表：\n```mermaid\nsequenceDiagram\n    A->>B: 请求\n```',
      { description: '调用链', diagramType: 'sequence' },
      { model: 'gpt-4o', provider: 'openai' },
    );

    expect(result.mermaidCode).toBe('sequenceDiagram\n    A->>B: 请求');
    expect(result.diagramType).toBe('sequence');
  });
});
