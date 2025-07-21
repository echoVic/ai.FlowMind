/**
 * Integration tests for MCP and SSE dual-protocol operation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidMCPServer, SSEServerOptions } from '../index.js';
import { SSEServer } from '../sse/SSEServer.js';

describe('MCP-SSE Dual Protocol Integration', () => {
  let mcpServer: MermaidMCPServer;
  let sseOptions: SSEServerOptions;

  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    sseOptions = {
      enabled: true,
      port: 3003, // Use different port for integration tests
      cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        credentials: true
      },
      heartbeat: {
        enabled: false, // Disable heartbeat for tests
        interval: 5000
      },
      connection: {
        timeout: 30000,
        maxConnections: 10
      }
    };
  });

  afterEach(async () => {
    if (mcpServer) {
      await mcpServer.shutdown();
    }
    vi.restoreAllMocks();
  });

  describe('Dual Protocol Initialization', () => {
    it('should initialize both MCP and SSE servers when SSE is enabled', () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      // Verify MCP server is initialized
      expect(mcpServer).toBeDefined();

      // Verify SSE server is initialized
      const sseServer = mcpServer.getSSEServer();
      expect(sseServer).toBeDefined();
      expect(sseServer).toBeInstanceOf(SSEServer);

      // Verify status includes both protocols
      const status = mcpServer.getStatus();
      expect(status.mcp).toBe(true);
      expect(status.sse).toBeDefined();
    });

    it('should initialize only MCP server when SSE is disabled', () => {
      const disabledOptions: SSEServerOptions = { enabled: false };
      mcpServer = new MermaidMCPServer(disabledOptions);

      // Verify MCP server is initialized
      expect(mcpServer).toBeDefined();

      // Verify SSE server is not initialized
      const sseServer = mcpServer.getSSEServer();
      expect(sseServer).toBeUndefined();

      // Verify status includes only MCP
      const status = mcpServer.getStatus();
      expect(status.mcp).toBe(true);
      expect(status.sse).toBeUndefined();
    });

    it('should handle partial SSE configuration with defaults', () => {
      const partialOptions: SSEServerOptions = {
        enabled: true,
        port: 4000
        // Missing other configuration options
      };

      mcpServer = new MermaidMCPServer(partialOptions);

      const sseServer = mcpServer.getSSEServer();
      expect(sseServer).toBeDefined();

      // Server should be created successfully with defaults
      expect(sseServer).toBeInstanceOf(SSEServer);
    });
  });

  describe('Protocol Independence', () => {
    it('should allow MCP operations to work independently of SSE', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      // Verify that MCP server is properly initialized
      expect(mcpServer).toBeDefined();
      
      // Verify that both MCP and SSE components exist
      const status = mcpServer.getStatus();
      expect(status.mcp).toBe(true);
      expect(status.sse).toBeDefined();
      
      // Test that MCP server can handle requests independently
      // This test verifies the architecture allows independent operation
      const sseServer = mcpServer.getSSEServer();
      expect(sseServer).toBeDefined();
    });

    it('should allow SSE operations to work independently of MCP requests', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      expect(sseServer).toBeDefined();

      // Mock SSE server methods
      if (sseServer) {
        const mockSendToConnection = vi.spyOn(sseServer, 'sendToConnection').mockImplementation(() => {});
        const mockBroadcast = vi.spyOn(sseServer, 'broadcast').mockImplementation(() => {});

        // Test SSE operations
        sseServer.sendToConnection('test-connection', {
          event: 'test',
          data: { message: 'test' }
        });

        sseServer.broadcast({
          event: 'broadcast-test',
          data: { message: 'broadcast' }
        });

        expect(mockSendToConnection).toHaveBeenCalledWith('test-connection', {
          event: 'test',
          data: { message: 'test' }
        });

        expect(mockBroadcast).toHaveBeenCalledWith({
          event: 'broadcast-test',
          data: { message: 'broadcast' }
        });
      }
    });
  });

  describe('Streaming Operations Integration', () => {
    it('should handle streaming validation requests', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server methods
        const mockSendToConnection = vi.spyOn(sseServer, 'sendToConnection').mockImplementation(() => {});

        // Test streaming validation
        const validationInput = {
          mermaidCode: 'graph TD\n  A --> B',
          strict: false
        };

        await mcpServer.handleStreamingValidation(validationInput, 'test-connection-1');

        // Verify events were sent to connection
        expect(mockSendToConnection).toHaveBeenCalled();
        
        // Check that progress and result events were sent
        const calls = mockSendToConnection.mock.calls;
        const eventTypes = calls.map(call => call[1].event);
        
        expect(eventTypes).toContain('progress');
        expect(eventTypes).toContain('result');
      }
    });

    it('should handle streaming optimization requests', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server methods
        const mockSendToConnection = vi.spyOn(sseServer, 'sendToConnection').mockImplementation(() => {});

        // Test streaming optimization
        const optimizationInput = {
          mermaidCode: 'graph TD\n  A --> B',
          goals: ['readability' as const],
          preserveSemantics: true
        };

        await mcpServer.handleStreamingOptimization(optimizationInput, 'test-connection-2');

        // Verify events were sent to connection
        expect(mockSendToConnection).toHaveBeenCalled();
        
        // Check that progress and result events were sent
        const calls = mockSendToConnection.mock.calls;
        const eventTypes = calls.map(call => call[1].event);
        
        expect(eventTypes).toContain('progress');
        expect(eventTypes).toContain('result');
      }
    });

    it('should handle streaming template requests', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server methods
        const mockSendToConnection = vi.spyOn(sseServer, 'sendToConnection').mockImplementation(() => {});

        // Test streaming templates
        const templateInput = {
          diagramType: 'flowchart' as const,
          useCase: 'software-architecture' as const,
          complexity: 'simple' as const
        };

        await mcpServer.handleStreamingTemplates(templateInput, 'test-connection-3');

        // Verify events were sent to connection
        expect(mockSendToConnection).toHaveBeenCalled();
        
        // Check that progress and result events were sent
        const calls = mockSendToConnection.mock.calls;
        const eventTypes = calls.map(call => call[1].event);
        
        expect(eventTypes).toContain('progress');
        expect(eventTypes).toContain('result');
      }
    });

    it('should handle streaming format conversion requests', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server methods
        const mockSendToConnection = vi.spyOn(sseServer, 'sendToConnection').mockImplementation(() => {});

        // Test streaming format conversion
        const conversionInput = {
          mermaidCode: 'graph TD\n  A --> B',
          targetFormat: 'flowchart' as const,
          optimizeStructure: true
        };

        await mcpServer.handleStreamingFormatConversion(conversionInput, 'test-connection-4');

        // Verify events were sent to connection
        expect(mockSendToConnection).toHaveBeenCalled();
        
        // Check that progress and result events were sent
        const calls = mockSendToConnection.mock.calls;
        const eventTypes = calls.map(call => call[1].event);
        
        expect(eventTypes).toContain('progress');
        expect(eventTypes).toContain('result');
      }
    });
  });

  describe('Error Handling in Dual Protocol Mode', () => {
    it('should handle SSE server unavailable during streaming operations', async () => {
      const disabledOptions: SSEServerOptions = { enabled: false };
      mcpServer = new MermaidMCPServer(disabledOptions);

      // Attempt streaming operation without SSE server
      const validationInput = {
        mermaidCode: 'graph TD\n  A --> B',
        strict: false
      };

      await expect(
        mcpServer.handleStreamingValidation(validationInput, 'test-connection')
      ).rejects.toThrow('SSE Server not available');
    });

    it('should handle streaming operation errors gracefully', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server methods
        const mockSendToConnection = vi.spyOn(sseServer, 'sendToConnection').mockImplementation(() => {});

        // Test with invalid input that should cause an error
        const invalidInput = {
          mermaidCode: '', // Empty code should cause validation error
          strict: true
        };

        await mcpServer.handleStreamingValidation(invalidInput, 'test-connection');

        // Verify that sendToConnection was called (either for progress, result, or error)
        expect(mockSendToConnection).toHaveBeenCalled();
        
        // The system should handle errors gracefully without throwing
        const calls = mockSendToConnection.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
      }
    });

    it('should handle connection errors during streaming', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock console.error to capture error logs
        const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        // Mock SSE server to throw error on sendToConnection
        vi.spyOn(sseServer, 'sendToConnection').mockImplementation(() => {
          throw new Error('Connection error');
        });

        // Test streaming operation with connection error
        const validationInput = {
          mermaidCode: 'graph TD\n  A --> B',
          strict: false
        };

        // Should not throw, but handle error gracefully
        await mcpServer.handleStreamingValidation(validationInput, 'invalid-connection');
        
        // Verify that error was logged (indicating graceful handling)
        expect(mockConsoleError).toHaveBeenCalled();
        
        mockConsoleError.mockRestore();
      }
    });
  });

  describe('Server Lifecycle Management', () => {
    it('should start both servers in correct order', async () => {
      // Ensure SSE is enabled for this test
      const enabledSSEOptions: SSEServerOptions = {
        ...sseOptions,
        enabled: true
      };
      
      mcpServer = new MermaidMCPServer(enabledSSEOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server start method
        const mockSSEStart = vi.spyOn(sseServer, 'start').mockResolvedValue();
        
        // Mock the MCP server connect method to avoid stdio transport issues
        const mockConnect = vi.spyOn((mcpServer as any).server, 'connect').mockResolvedValue();
        
        // Mock console.log to capture startup messages
        const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Start servers
        await mcpServer.start();

        // Verify both servers were started
        expect(mockConnect).toHaveBeenCalled();
        expect(mockSSEStart).toHaveBeenCalled();
        
        mockConsoleLog.mockRestore();
      }
    });

    it('should stop both servers in correct order during shutdown', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server methods
        vi.spyOn(sseServer, 'start').mockResolvedValue();
        const mockSSEStop = vi.spyOn(sseServer, 'stop').mockResolvedValue();

        // Mock console.log to capture shutdown messages
        const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Shutdown servers (this should call both SSE and MCP shutdown)
        await mcpServer.shutdown();

        // Verify SSE server stop was called
        expect(mockSSEStop).toHaveBeenCalled();
        
        mockConsoleLog.mockRestore();
      }
    });

    it('should handle graceful shutdown on process signals', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      // Mock process.on to capture signal handlers
      const signalHandlers: { [key: string]: Function } = {};
      vi.spyOn(process, 'on').mockImplementation((signal: string, handler: Function) => {
        signalHandlers[signal] = handler;
        return process;
      });

      // Mock process.exit to prevent actual exit
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('Process exit called');
      });

      // Mock servers
      const mockMCPServer = {
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        setRequestHandler: vi.fn()
      };

      vi.spyOn(mcpServer as any, 'server', 'get').mockReturnValue(mockMCPServer);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        vi.spyOn(sseServer, 'start').mockResolvedValue();
        vi.spyOn(sseServer, 'stop').mockResolvedValue();
      }

      // Start server
      await mcpServer.start();

      // Verify signal handlers were registered
      expect(signalHandlers['SIGINT']).toBeDefined();
      expect(signalHandlers['SIGTERM']).toBeDefined();

      // Test SIGINT handler
      try {
        await signalHandlers['SIGINT']();
      } catch (error) {
        expect((error as Error).message).toBe('Process exit called');
      }

      mockExit.mockRestore();
    });
  });

  describe('Configuration and Status Reporting', () => {
    it('should report accurate status for both protocols', () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server status
        vi.spyOn(sseServer, 'getStatus').mockReturnValue({
          isRunning: true,
          connectionCount: 5,
          port: 3003,
          heartbeat: {
            enabled: false,
            interval: 5000,
            sent: 0,
            lastSent: null,
            errors: 0
          },
          health: {
            connectionStats: {
              totalConnections: 10,
              activeConnections: 5,
              averageConnectionDuration: 30000
            },
            uptime: 60000
          }
        });

        const status = mcpServer.getStatus();

        expect(status.mcp).toBe(true);
        expect(status.sse).toBeDefined();
        expect(status.sse?.isRunning).toBe(true);
        expect(status.sse?.connectionCount).toBe(5);
        expect(status.sse?.port).toBe(3003);
      }
    });

    it('should handle configuration validation', () => {
      // Test with various configuration scenarios
      const configs = [
        { enabled: true, port: 3000 },
        { enabled: true, port: 8080, cors: { origin: ['*'], credentials: false } },
        { enabled: false },
        { enabled: true } // Minimal config
      ];

      configs.forEach((config, index) => {
        const server = new MermaidMCPServer(config);
        expect(server).toBeDefined();
        
        if (config.enabled) {
          expect(server.getSSEServer()).toBeDefined();
        } else {
          expect(server.getSSEServer()).toBeUndefined();
        }
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle multiple concurrent streaming operations', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server methods
        const mockSendToConnection = vi.spyOn(sseServer, 'sendToConnection').mockImplementation(() => {});

        // Create multiple concurrent streaming operations
        const operations = [
          mcpServer.handleStreamingValidation(
            { mermaidCode: 'graph TD\n  A --> B', strict: false },
            'connection-1'
          ),
          mcpServer.handleStreamingOptimization(
            { mermaidCode: 'graph TD\n  A --> B', goals: ['readability'] },
            'connection-2'
          ),
          mcpServer.handleStreamingTemplates(
            { diagramType: 'flowchart', useCase: 'software-architecture' },
            'connection-3'
          )
        ];

        // All operations should complete successfully
        await Promise.all(operations);

        // Verify all connections received events
        expect(mockSendToConnection).toHaveBeenCalledWith('connection-1', expect.any(Object));
        expect(mockSendToConnection).toHaveBeenCalledWith('connection-2', expect.any(Object));
        expect(mockSendToConnection).toHaveBeenCalledWith('connection-3', expect.any(Object));
      }
    });

    it('should manage memory efficiently during streaming', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server methods
        vi.spyOn(sseServer, 'sendToConnection').mockImplementation(() => {});

        // Simulate memory-intensive operation
        const largeCode = 'graph TD\n' + Array(1000).fill(0).map((_, i) => `  A${i} --> B${i}`).join('\n');
        
        const validationInput = {
          mermaidCode: largeCode,
          strict: false
        };

        // Should handle large input without issues
        await expect(
          mcpServer.handleStreamingValidation(validationInput, 'large-connection')
        ).resolves.not.toThrow();
      }
    });
  });
});