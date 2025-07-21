#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { handleConvertDiagramFormat, handleGetDiagramTemplates, handleOptimizeDiagram, handleValidateMermaid } from './handlers.js';
import { StreamingContext } from './sse/events.js';
import { SSEServer } from './sse/SSEServer.js';
import { StreamingHandlers } from './sse/StreamingHandlers.js';
import { SSEServerConfig } from './sse/types.js';
import { mcpTools, validateInput } from './tools.js';

/**
 * SSE Server configuration options
 */
export interface SSEServerOptions {
  enabled: boolean;
  port?: number;
  cors?: {
    origin?: string[];
    credentials?: boolean;
  };
  heartbeat?: {
    enabled?: boolean;
    interval?: number;
  };
  connection?: {
    timeout?: number;
    maxConnections?: number;
  };
}

/**
 * MCP Mermaid 服务器
 */
class MermaidMCPServer {
  private server: Server;
  private sseServer?: SSEServer;
  private sseOptions?: SSEServerOptions;
  private streamingHandlers: StreamingHandlers;

  constructor(sseOptions?: SSEServerOptions) {
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

    this.sseOptions = sseOptions;
    this.streamingHandlers = new StreamingHandlers();
    this.setupHandlers();
    
    // Initialize SSE server if enabled
    this.initSSEServer();
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
   * 初始化SSE服务器
   */
  private initSSEServer(): void {
    if (!this.sseOptions?.enabled) {
      return;
    }

    const config: SSEServerConfig = {
      port: this.sseOptions.port || 3001,
      cors: {
        origin: this.sseOptions.cors?.origin || ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: this.sseOptions.cors?.credentials || true
      },
      heartbeat: {
        enabled: this.sseOptions.heartbeat?.enabled || true,
        interval: this.sseOptions.heartbeat?.interval || 30000
      },
      connection: {
        timeout: this.sseOptions.connection?.timeout || 60000,
        maxConnections: this.sseOptions.connection?.maxConnections || 100
      }
    };

    this.sseServer = new SSEServer(config);
  }

  /**
   * 启动SSE服务器
   */
  private async startSSEServer(): Promise<void> {
    if (!this.sseServer) {
      return;
    }

    try {
      await this.sseServer.start();
      console.log('✅ SSE Server started successfully');
    } catch (error) {
      console.error('❌ Failed to start SSE Server:', error);
      throw error;
    }
  }

  /**
   * 停止SSE服务器
   */
  private async stopSSEServer(): Promise<void> {
    if (!this.sseServer) {
      return;
    }

    try {
      await this.sseServer.stop();
      console.log('✅ SSE Server stopped successfully');
    } catch (error) {
      console.error('❌ Failed to stop SSE Server:', error);
    }
  }

  /**
   * 获取SSE服务器实例（用于发送事件）
   */
  public getSSEServer(): SSEServer | undefined {
    return this.sseServer;
  }

  /**
   * Handle streaming validation request
   */
  public async handleStreamingValidation(input: any, connectionId: string): Promise<void> {
    if (!this.sseServer) {
      throw new Error('SSE Server not available');
    }

    const requestId = this.generateRequestId();
    const context: StreamingContext = {
      connectionId,
      requestId,
      emit: (data) => {
        this.sseServer!.sendToConnection(connectionId, {
          event: 'progress',
          data
        });
      }
    };

    try {
      const result = await this.streamingHandlers.streamValidation(input, context);
      
      // Send final result
      try {
        this.sseServer.sendToConnection(connectionId, {
          event: 'result',
          data: { requestId, operation: 'validation', result }
        });
      } catch (connectionError) {
        console.error(`Failed to send result to connection ${connectionId}:`, connectionError);
      }
    } catch (error) {
      try {
        this.sseServer.sendToConnection(connectionId, {
          event: 'error',
          data: { 
            requestId, 
            operation: 'validation', 
            error: error instanceof Error ? error.message : String(error) 
          }
        });
      } catch (connectionError) {
        console.error(`Failed to send error to connection ${connectionId}:`, connectionError);
      }
    }
  }

  /**
   * Handle streaming optimization request
   */
  public async handleStreamingOptimization(input: any, connectionId: string): Promise<void> {
    if (!this.sseServer) {
      throw new Error('SSE Server not available');
    }

    const requestId = this.generateRequestId();
    const context: StreamingContext = {
      connectionId,
      requestId,
      emit: (data) => {
        this.sseServer!.sendToConnection(connectionId, {
          event: 'progress',
          data
        });
      }
    };

    try {
      const result = await this.streamingHandlers.streamOptimization(input, context);
      
      // Send final result
      try {
        this.sseServer.sendToConnection(connectionId, {
          event: 'result',
          data: { requestId, operation: 'optimization', result }
        });
      } catch (connectionError) {
        console.error(`Failed to send result to connection ${connectionId}:`, connectionError);
      }
    } catch (error) {
      try {
        this.sseServer.sendToConnection(connectionId, {
          event: 'error',
          data: { 
            requestId, 
            operation: 'optimization', 
            error: error instanceof Error ? error.message : String(error) 
          }
        });
      } catch (connectionError) {
        console.error(`Failed to send error to connection ${connectionId}:`, connectionError);
      }
    }
  }

  /**
   * Handle streaming template generation request
   */
  public async handleStreamingTemplates(input: any, connectionId: string): Promise<void> {
    if (!this.sseServer) {
      throw new Error('SSE Server not available');
    }

    const requestId = this.generateRequestId();
    const context: StreamingContext = {
      connectionId,
      requestId,
      emit: (data) => {
        this.sseServer!.sendToConnection(connectionId, {
          event: 'progress',
          data
        });
      }
    };

    try {
      const result = await this.streamingHandlers.streamTemplateGeneration(input, context);
      
      // Send final result
      try {
        this.sseServer.sendToConnection(connectionId, {
          event: 'result',
          data: { requestId, operation: 'templates', result }
        });
      } catch (connectionError) {
        console.error(`Failed to send result to connection ${connectionId}:`, connectionError);
      }
    } catch (error) {
      try {
        this.sseServer.sendToConnection(connectionId, {
          event: 'error',
          data: { 
            requestId, 
            operation: 'templates', 
            error: error instanceof Error ? error.message : String(error) 
          }
        });
      } catch (connectionError) {
        console.error(`Failed to send error to connection ${connectionId}:`, connectionError);
      }
    }
  }

  /**
   * Handle streaming format conversion request
   */
  public async handleStreamingFormatConversion(input: any, connectionId: string): Promise<void> {
    if (!this.sseServer) {
      throw new Error('SSE Server not available');
    }

    const requestId = this.generateRequestId();
    const context: StreamingContext = {
      connectionId,
      requestId,
      emit: (data) => {
        this.sseServer!.sendToConnection(connectionId, {
          event: 'progress',
          data
        });
      }
    };

    try {
      const result = await this.streamingHandlers.streamFormatConversion(input, context);
      
      // Send final result
      try {
        this.sseServer.sendToConnection(connectionId, {
          event: 'result',
          data: { requestId, operation: 'format_conversion', result }
        });
      } catch (connectionError) {
        console.error(`Failed to send result to connection ${connectionId}:`, connectionError);
      }
    } catch (error) {
      try {
        this.sseServer.sendToConnection(connectionId, {
          event: 'error',
          data: { 
            requestId, 
            operation: 'format_conversion', 
            error: error instanceof Error ? error.message : String(error) 
          }
        });
      } catch (connectionError) {
        console.error(`Failed to send error to connection ${connectionId}:`, connectionError);
      }
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 获取服务器状态
   */
  public getStatus(): { mcp: boolean; sse?: { isRunning: boolean; connectionCount: number; port: number } } {
    const status: any = { mcp: true };
    
    if (this.sseServer) {
      status.sse = this.sseServer.getStatus();
    }
    
    return status;
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    // 初始化SSE服务器
    this.initSSEServer();

    // 启动MCP服务器
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('✅ MCP Server started successfully');

    // 启动SSE服务器（如果启用）
    if (this.sseOptions?.enabled) {
      await this.startSSEServer();
    }
    
    // 优雅关闭处理
    process.on('SIGINT', async () => {
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.shutdown();
      process.exit(0);
    });
  }

  /**
   * 优雅关闭服务器
   */
  public async shutdown(): Promise<void> {
    console.log('🔄 Shutting down servers...');
    
    // 停止SSE服务器
    await this.stopSSEServer();
    
    // 停止MCP服务器
    await this.server.close();
    console.log('✅ All servers shut down successfully');
  }
}

// 启动服务器
async function main() {
  try {
    // Parse command line arguments for SSE configuration
    const args = process.argv.slice(2);
    const sseEnabled = args.includes('--sse') || process.env.MCP_SSE_ENABLED === 'true';
    const ssePort = parseInt(process.env.MCP_SSE_PORT || '3001');
    
    let sseOptions: SSEServerOptions | undefined;
    
    if (sseEnabled) {
      sseOptions = {
        enabled: true,
        port: ssePort,
        cors: {
          origin: process.env.MCP_SSE_CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://127.0.0.1:3000'],
          credentials: process.env.MCP_SSE_CORS_CREDENTIALS !== 'false'
        },
        heartbeat: {
          enabled: process.env.MCP_SSE_HEARTBEAT_ENABLED !== 'false',
          interval: parseInt(process.env.MCP_SSE_HEARTBEAT_INTERVAL || '30000')
        },
        connection: {
          timeout: parseInt(process.env.MCP_SSE_CONNECTION_TIMEOUT || '60000'),
          maxConnections: parseInt(process.env.MCP_SSE_MAX_CONNECTIONS || '100')
        }
      };
      
      console.log(`🚀 Starting MCP server with SSE enabled on port ${ssePort}`);
    } else {
      console.log('🚀 Starting MCP server (SSE disabled)');
    }
    
    const server = new MermaidMCPServer(sseOptions);
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
