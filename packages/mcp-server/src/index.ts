#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { handleValidateMermaid, handleGetDiagramTemplates, handleOptimizeDiagram, handleConvertDiagramFormat } from './handlers.js';

/**
 * MCP Mermaid 服务器 (SDK v1.x)
 */
const server = new McpServer({
  name: '@flowmind/mcp-server',
  version: '0.1.0',
});

// validate_mermaid
server.tool(
  'validate_mermaid',
  `验证 Mermaid 图表语法的正确性。
检查语法是否正确、提供错误信息和行号、给出修复建议、支持所有 Mermaid 图表类型。`,
  {
    mermaidCode: z.string().min(1).describe('要验证的 Mermaid 图表代码'),
    strict: z.boolean().default(false).describe('是否启用严格模式验证'),
  },
  async (args) => {
    return await handleValidateMermaid(args);
  }
);

// get_diagram_templates
server.tool(
  'get_diagram_templates',
  `获取预定义的 Mermaid 图表模板。
提供多种图表类型模板、不同复杂度示例、针对不同用例的模板和完整示例代码。`,
  {
    diagramType: z.enum([
      'flowchart', 'sequence', 'class', 'er', 'gantt',
      'pie', 'journey', 'gitgraph', 'mindmap', 'timeline'
    ]).optional().describe('图表类型'),
    useCase: z.enum([
      'software-architecture', 'business-process', 'database-design',
      'project-management', 'general'
    ]).optional().describe('使用场景'),
    complexity: z.enum(['simple', 'medium', 'complex']).optional().describe('复杂度级别'),
  },
  async (args) => {
    return await handleGetDiagramTemplates(args);
  }
);

// optimize_diagram
server.tool(
  'optimize_diagram',
  `优化 Mermaid 图表的布局和可读性。
自动优化布局和结构、提供可读性改进建议、分析复杂度并给出优化方案。`,
  {
    mermaidCode: z.string().min(1).describe('要优化的 Mermaid 图表代码'),
    goals: z.array(z.enum(['readability', 'compactness', 'aesthetics', 'accessibility']))
      .default(['readability']).describe('优化目标'),
    preserveSemantics: z.boolean().default(true).describe('是否保持语义不变'),
    maxSuggestions: z.number().min(1).max(10).default(5).describe('最大建议数量'),
  },
  async (args) => {
    return await handleOptimizeDiagram(args);
  }
);

// convert_diagram_format
server.tool(
  'convert_diagram_format',
  `转换 Mermaid 图表格式或优化现有格式。
转换不同图表类型、优化语法结构、标准化格式。`,
  {
    mermaidCode: z.string().min(1).describe('要转换的 Mermaid 图表代码'),
    targetFormat: z.enum([
      'flowchart', 'sequence', 'class', 'er', 'gantt',
      'pie', 'journey', 'gitgraph', 'auto'
    ]).default('auto').describe('目标格式（auto 为自动选择）'),
    optimizeStructure: z.boolean().default(true).describe('是否优化结构'),
  },
  async (args) => {
    return await handleConvertDiagramFormat(args);
  }
);

/**
 * 启动服务器
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

export { server };
