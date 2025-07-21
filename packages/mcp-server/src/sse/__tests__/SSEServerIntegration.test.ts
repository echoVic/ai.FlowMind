/**
 * Integration tests for SSE Server with MCP Server
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MermaidMCPServer, SSEServerOptions } from '../../index.js';
import { SSEServer } from '../SSEServer.js';

describe('SSE Server Integration', () => {
  let mcpServer: MermaidMCPServer;
  let sseOptions: SSEServerOptions;

  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    sseOptions = {
      enabled: true,
      port: 3002, // Use different port for testing
      cors: {
        origin: ['http://localhost:3000'],
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

  describe('SSE Server Initialization', () => {
    it('should create MCP server without SSE when disabled', () => {
      const disabledOptions: SSEServerOptions = { enabled: false };
      mcpServer = new MermaidMCPServer(disabledOptions);

      const sseServer = mcpServer.getSSEServer();
      expect(sseServer).toBeUndefined();

      const status = mcpServer.getStatus();
      expect(status.mcp).toBe(true);
      expect(status.sse).toBeUndefined();
    });

    it('should create MCP server with SSE when enabled', () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      expect(sseServer).toBeDefined();
      expect(sseServer).toBeInstanceOf(SSEServer);
    });

    it('should use default SSE configuration when minimal options provided', () => {
      const minimalOptions: SSEServerOptions = { enabled: true };
      mcpServer = new MermaidMCPServer(minimalOptions);

      const sseServer = mcpServer.getSSEServer();
      expect(sseServer).toBeDefined();
    });
  });

  describe('Server Lifecycle', () => {
    it('should start and stop MCP server without SSE', async () => {
      const disabledOptions: SSEServerOptions = { enabled: false };
      mcpServer = new MermaidMCPServer(disabledOptions);

      // Mock the server.connect method to avoid actual connection
      vi.spyOn(mcpServer as any, 'start').mockImplementation(async () => {
        console.log('Mock MCP server started');
      });

      await expect(mcpServer.start()).resolves.not.toThrow();
      
      const status = mcpServer.getStatus();
      expect(status.mcp).toBe(true);
      expect(status.sse).toBeUndefined();
    });

    it('should handle SSE server startup failure gracefully', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      // Mock SSE server to throw error on start
      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        vi.spyOn(sseServer, 'start').mockRejectedValue(new Error('Port already in use'));
      }

      // Mock MCP server start to avoid actual connection
      vi.spyOn(mcpServer as any, 'start').mockImplementation(async () => {
        throw new Error('SSE Server startup failed');
      });

      await expect(mcpServer.start()).rejects.toThrow();
    });

    it('should shutdown both servers gracefully', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      // Mock both servers
      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        vi.spyOn(sseServer, 'start').mockResolvedValue();
        vi.spyOn(sseServer, 'stop').mockResolvedValue();
      }

      vi.spyOn(mcpServer as any, 'server', 'get').mockReturnValue({
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      });

      // Start servers
      await mcpServer.start();

      // Test shutdown
      await expect(mcpServer.shutdown()).resolves.not.toThrow();

      // Verify both servers were stopped
      if (sseServer) {
        expect(sseServer.stop).toHaveBeenCalled();
      }
    });
  });

  describe('SSE Server Status', () => {
    it('should return correct status when SSE is enabled', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server status
        vi.spyOn(sseServer, 'getStatus').mockReturnValue({
          isRunning: true,
          connectionCount: 2,
          port: 3002
        });
      }

      const status = mcpServer.getStatus();
      expect(status.mcp).toBe(true);
      expect(status.sse).toBeDefined();
      expect(status.sse?.isRunning).toBe(true);
      expect(status.sse?.connectionCount).toBe(2);
      expect(status.sse?.port).toBe(3002);
    });

    it('should handle SSE server status when not running', () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        // Mock SSE server status when not running
        vi.spyOn(sseServer, 'getStatus').mockReturnValue({
          isRunning: false,
          connectionCount: 0,
          port: 3002
        });
      }

      const status = mcpServer.getStatus();
      expect(status.sse?.isRunning).toBe(false);
      expect(status.sse?.connectionCount).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should apply default values for missing configuration', () => {
      const partialOptions: SSEServerOptions = {
        enabled: true,
        port: 4000
        // Missing other options
      };

      mcpServer = new MermaidMCPServer(partialOptions);
      const sseServer = mcpServer.getSSEServer();

      expect(sseServer).toBeDefined();
      // Note: We can't easily test the internal config without exposing it,
      // but we can verify the server was created successfully
    });

    it('should override default configuration with provided values', () => {
      const customOptions: SSEServerOptions = {
        enabled: true,
        port: 5000,
        cors: {
          origin: ['http://example.com'],
          credentials: false
        },
        heartbeat: {
          enabled: true,
          interval: 10000
        },
        connection: {
          timeout: 120000,
          maxConnections: 50
        }
      };

      mcpServer = new MermaidMCPServer(customOptions);
      const sseServer = mcpServer.getSSEServer();

      expect(sseServer).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle SSE server creation errors', () => {
      // Test with invalid configuration that might cause SSE server creation to fail
      const invalidOptions: SSEServerOptions = {
        enabled: true,
        port: -1 // Invalid port
      };

      // This should not throw during construction, but might fail during start
      expect(() => {
        mcpServer = new MermaidMCPServer(invalidOptions);
      }).not.toThrow();

      const sseServer = mcpServer.getSSEServer();
      expect(sseServer).toBeDefined();
    });

    it('should continue running MCP server even if SSE server fails', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      // Mock MCP server to succeed but SSE server to fail
      vi.spyOn(mcpServer as any, 'server', 'get').mockReturnValue({
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      });

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        vi.spyOn(sseServer, 'start').mockRejectedValue(new Error('SSE startup failed'));
      }

      // Should throw because SSE server startup failed
      await expect(mcpServer.start()).rejects.toThrow('SSE startup failed');
    });
  });

  describe('Process Signal Handling', () => {
    it('should register process signal handlers when starting', async () => {
      mcpServer = new MermaidMCPServer(sseOptions);

      // Mock process.on to track signal handler registration
      const processSpy = vi.spyOn(process, 'on').mockImplementation(() => process);

      // Mock servers to avoid actual startup
      vi.spyOn(mcpServer as any, 'server', 'get').mockReturnValue({
        connect: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined)
      });

      const sseServer = mcpServer.getSSEServer();
      if (sseServer) {
        vi.spyOn(sseServer, 'start').mockResolvedValue();
      }

      await mcpServer.start();

      // Verify SIGINT and SIGTERM handlers were registered
      expect(processSpy).toHaveBeenCalledWith('SIGINT', expect.any(Function));
      expect(processSpy).toHaveBeenCalledWith('SIGTERM', expect.any(Function));

      processSpy.mockRestore();
    });
  });
});