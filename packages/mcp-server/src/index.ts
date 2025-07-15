#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { mcpTools, validateInput } from './tools.js';
import { handleValidateMermaid, handleGetDiagramTemplates, handleOptimizeDiagram, handleConvertDiagramFormat } from './handlers.js';

/**
 * MCP Mermaid 服务器
 */
class MermaidMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: '@flowmind/mcp-server',
        version: '0.1.0',
        description: 'MCP server for Mermaid diagram generation and validation'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  /**
   * 设置请求处理器
   */
  private setupHandlers(): void {
    // 处理工具列表请求
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: mcpTools
      };
    });

    // 处理工具调用请求
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // 验证输入参数
        const validatedArgs = validateInput(name, args);

        // 根据工具名称分发到对应的处理器
        switch (name) {
          case 'validate_mermaid':
            return await handleValidateMermaid(validatedArgs);
          
          case 'get_diagram_templates':
            return await handleGetDiagramTemplates(validatedArgs);
          
          case 'optimize_diagram':
            return await handleOptimizeDiagram(validatedArgs);
          
          case 'convert_diagram_format':
            return await handleConvertDiagramFormat(validatedArgs);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        // 统一错误处理
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{
            type: 'text',
            text: `❌ **工具调用失败**

工具名称: ${name}
错误信息: ${errorMessage}

请检查输入参数是否正确。`
          }]
        };
      }
    });
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // 优雅关闭处理
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.server.close();
      process.exit(0);
    });
  }
}

// 启动服务器
async function main() {
  try {
    const server = new MermaidMCPServer();
    await server.start();
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// 仅在直接运行时启动服务器
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MermaidMCPServer };