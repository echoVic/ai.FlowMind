#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { handleConvertDiagramFormat, handleGetDiagramTemplates, handleOptimizeDiagram, handleValidateMermaid } from './handlers.js';
import { StreamingHandlers } from './sse/StreamingHandlers.js';
import { mcpTools, validateInput } from './tools.js';
import { ConvertFormatInput, GetTemplatesInput, OptimizeDiagramInput, ValidateMermaidInput } from './types.js';

/**
 * HTTP Server configuration options
 */
export interface HttpServerOptions {
  enabled: boolean;
  port?: number;
  cors?: {
    origin?: string[];
    credentials?: boolean;
  };
}

/**
 * MCP Mermaid 服务器
 */
class MermaidMCPServer {
  private server: Server;
  private httpOptions?: HttpServerOptions;
  private streamingHandlers: StreamingHandlers;
  private httpServer: ReturnType<typeof createServer> | null = null;

  constructor(httpOptions?: HttpServerOptions) {
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

    this.httpOptions = httpOptions;
    this.streamingHandlers = new StreamingHandlers();
    this.setupHandlers();
    
    // Initialize HTTP server if enabled
    if (this.httpOptions?.enabled) {
      this.initHttpServer();
    }
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
            return await handleValidateMermaid(validatedArgs as ValidateMermaidInput);
          
          case 'get_diagram_templates':
            return await handleGetDiagramTemplates(validatedArgs as GetTemplatesInput);
          
          case 'optimize_diagram':
            return await handleOptimizeDiagram(validatedArgs as OptimizeDiagramInput);
          
          case 'convert_diagram_format':
            return await handleConvertDiagramFormat(validatedArgs as ConvertFormatInput);
          
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
   * 初始化HTTP服务器
   */
  private initHttpServer(): void {
    if (!this.httpOptions?.enabled) {
      return;
    }

    this.httpServer = createServer(this.handleHttpRequest.bind(this));
  }

  /**
   * 启动 HTTP 服务器
   */
  private async startHttpServer(): Promise<void> {
    if (!this.httpOptions?.enabled || !this.httpServer) {
      return;
    }

    const port = this.httpOptions.port || 3001;
    
    return new Promise((resolve, reject) => {
      this.httpServer!.listen(port, () => {
        console.log(`🌐 HTTP Server started on port ${port}`);
        resolve();
      });
      
      this.httpServer!.on('error', (err: any) => {
        console.error(`启动 HTTP 服务器失败:`, err);
        reject(err);
      });
    });
  }

  /**
   * 设置 CORS 头
   */
  private setCORSHeaders(res: ServerResponse, req: IncomingMessage): void {
    res.setHeader('Access-Control-Allow-Origin', this.httpOptions?.cors?.origin?.join(', ') || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  /**
   * 读取HTTP请求体
   */
  private readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * 处理标准 MCP JSON-RPC 协议请求
   */
  private async handleMCPRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') {
      this.sendJsonResponse(res, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      // 读取请求体
      const body = await this.readRequestBody(req);
      const jsonRpcRequest = JSON.parse(body);

      // 验证 JSON-RPC 请求格式
      if (!jsonRpcRequest.jsonrpc || jsonRpcRequest.jsonrpc !== '2.0') {
        this.sendJsonResponse(res, 400, {
          jsonrpc: '2.0',
          id: jsonRpcRequest.id !== undefined ? jsonRpcRequest.id : 0,
          error: { code: -32600, message: 'Invalid Request' }
        });
        return;
      }

      // 处理不同的 MCP 方法
      let result;
      switch (jsonRpcRequest.method) {
        case 'tools/list':
          // 直接返回工具列表
          result = {
            tools: mcpTools
          };
          break;

        case 'tools/call':
          // 调用工具处理逻辑
          const { name, arguments: args } = jsonRpcRequest.params;
          try {
            const validatedArgs = validateInput(name, args);
            switch (name) {
              case 'validate_mermaid':
                result = await handleValidateMermaid(validatedArgs as ValidateMermaidInput);
                break;
              case 'get_diagram_templates':
                result = await handleGetDiagramTemplates(validatedArgs as GetTemplatesInput);
                break;
              case 'optimize_diagram':
                result = await handleOptimizeDiagram(validatedArgs as OptimizeDiagramInput);
                break;
              case 'convert_diagram_format':
                result = await handleConvertDiagramFormat(validatedArgs as ConvertFormatInput);
                break;
              default:
                throw new Error(`Unknown tool: ${name}`);
            }
          } catch (error) {
            this.sendJsonResponse(res, 200, {
              jsonrpc: '2.0',
              id: jsonRpcRequest.id,
              error: {
                code: -32602,
                message: 'Invalid params',
                data: error instanceof Error ? error.message : String(error)
              }
            });
            return;
          }
          break;

        case 'resources/list':
          // 返回空资源列表（如果需要的话）
          result = { resources: [] };
          break;

        case 'resources/read':
          // 资源读取（如果需要的话）
          this.sendJsonResponse(res, 200, {
            jsonrpc: '2.0',
            id: jsonRpcRequest.id,
            error: { code: -32601, message: 'Resources not implemented' }
          });
          return;

        default:
          this.sendJsonResponse(res, 200, {
            jsonrpc: '2.0',
            id: jsonRpcRequest.id !== undefined ? jsonRpcRequest.id : 0,
            error: { code: -32601, message: 'Method not found' }
          });
          return;
      }

      // 发送成功响应
      this.sendJsonResponse(res, 200, {
        jsonrpc: '2.0',
        id: jsonRpcRequest.id,
        result
      });

    } catch (error) {
      console.error('MCP request error:', error);
      this.sendJsonResponse(res, 500, {
        jsonrpc: '2.0',
        id: 0, // 使用默认 id 而不是 null
        error: { 
          code: -32603, 
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * 处理 HTTP 请求 - 支持标准 MCP 协议和流式架构
   */
  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    // 设置 CORS 头
    this.setCORSHeaders(res, req);
    
    // 处理 OPTIONS 请求（CORS 预检）
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 解析 URL
    const url = new URL(req.url!, `http://${req.headers.host}`);
    
    // 处理标准 MCP 协议端点（根路径）
    if (url.pathname === '/' || url.pathname === '') {
      this.handleMCPRequest(req, res);
      return;
    }

    // 处理健康检查（GET 请求）
    if (url.pathname === '/health' && req.method === 'GET') {
      this.handleHealthCheck(req, res);
      return;
    }
    
    // 只处理 POST 请求到流式端点
    if (req.method !== 'POST') {
      this.sendJsonResponse(res, 405, { success: false, error: 'Method not allowed' });
      return;
    }

    // 路由到不同的流式端点
    switch (url.pathname) {
      case '/api/stream/validate':
        this.handleStreamValidation(req, res);
        break;
      case '/api/stream/optimize':
        this.handleStreamOptimization(req, res);
        break;
      case '/api/stream/templates':
        this.handleStreamTemplates(req, res);
        break;
      case '/api/stream/convert':
        this.handleStreamConversion(req, res);
        break;
      default:
        this.sendJsonResponse(res, 404, { success: false, error: 'Not found' });
        return;
    }
  }

  /**
   * 处理流式验证请求
   */
  private handleStreamValidation(req: IncomingMessage, res: ServerResponse): void {
    this.handleStreamingRequest(req, res, async (input: ValidateMermaidInput) => {
      return await this.streamingHandlers.streamValidation(input, res);
    });
  }

  /**
   * 处理流式优化请求
   */
  private handleStreamOptimization(req: IncomingMessage, res: ServerResponse): void {
    this.handleStreamingRequest(req, res, async (input: OptimizeDiagramInput) => {
      return await this.streamingHandlers.streamOptimization(input, res);
    });
  }

  /**
   * 处理流式模板请求
   */
  private handleStreamTemplates(req: IncomingMessage, res: ServerResponse): void {
    this.handleStreamingRequest(req, res, async (input: GetTemplatesInput) => {
      return await this.streamingHandlers.streamTemplateGeneration(input, res);
    });
  }

  /**
   * 处理流式转换请求
   */
  private handleStreamConversion(req: IncomingMessage, res: ServerResponse): void {
    this.handleStreamingRequest(req, res, async (input: ConvertFormatInput) => {
      return await this.streamingHandlers.streamFormatConversion(input, res);
    });
  }

  /**
   * 通用流式请求处理器
   */
  private handleStreamingRequest<T>(
    req: IncomingMessage, 
    res: ServerResponse, 
    handler: (input: T) => Promise<any>
  ): void {
    // 设置流式响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': this.httpOptions?.cors?.origin?.join(', ') || '*',
      'Access-Control-Allow-Credentials': 'true'
    });

    // 读取请求体
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        // 解析请求体
        const input = JSON.parse(body) as T;
        
        // 调用处理器
        await handler(input);
        
        // 关闭连接
        res.end();
      } catch (error) {
        // 发送错误事件
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.writeSSEEvent(res, 'error', { error: errorMessage });
        res.end();
      }
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      this.writeSSEEvent(res, 'error', { error: 'Request processing failed' });
      res.end();
    });
  }

  /**
   * 写入 SSE 事件
   */
  private writeSSEEvent(res: ServerResponse, event: string, data: any): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * 处理健康检查请求
   */
  private handleHealthCheck(req: IncomingMessage, res: ServerResponse): void {
    this.sendJsonResponse(res, 200, { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      server: 'mcp-streamable-http'
    });
  }

  /**
   * 发送 JSON 响应
   */
  private sendJsonResponse(res: ServerResponse, statusCode: number, data: any): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * 获取服务器状态
   */
  public getStatus(): { mcp: boolean; http?: { isRunning: boolean; port: number } } {
    const status: any = { mcp: true };
    
    if (this.httpOptions?.enabled) {
      status.http = {
        isRunning: this.httpServer !== null,
        port: this.httpOptions.port || 3001
      };
    }
    
    return status;
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    // 启动MCP服务器
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('✅ MCP Server started successfully');

    // 启动HTTP服务器（如果启用）
    if (this.httpOptions?.enabled) {
      await this.startHttpServer();
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
    
    // 停止HTTP服务器
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => {
          console.log('✅ HTTP Server shut down successfully');
          resolve();
        });
      });
    }
    
    // 停止MCP服务器
    await this.server.close();
    console.log('✅ All servers shut down successfully');
  }
}

// 启动服务器
async function main() {
  try {
    // Parse command line arguments for HTTP configuration
    const args = process.argv.slice(2);
    const httpEnabled = args.includes('--http') || process.env.MCP_HTTP_ENABLED === 'true';
    const httpPort = parseInt(process.env.MCP_HTTP_PORT || '3001');
    
    let httpOptions: HttpServerOptions | undefined;
    
    if (httpEnabled) {
      httpOptions = {
        enabled: true,
        port: httpPort,
        cors: {
          origin: process.env.MCP_HTTP_CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://127.0.0.1:3000'],
          credentials: process.env.MCP_HTTP_CORS_CREDENTIALS !== 'false'
        }
      };
      
      console.log(`🚀 Starting MCP server with StreamableHttp enabled on port ${httpPort}`);
    } else {
      console.log('🚀 Starting MCP server (StreamableHttp disabled)');
    }
    
    const server = new MermaidMCPServer(httpOptions);
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
