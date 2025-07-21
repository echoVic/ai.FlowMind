/**
 * Unit tests for SSEServer class
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { SSEServer } from '../SSEServer';
import { SSEServerConfig } from '../types';

// Mock the http module
vi.mock('http', () => ({
  createServer: vi.fn()
}));

// Mock the SSEConnectionManager
vi.mock('../SSEConnectionManager', () => ({
  SSEConnectionManager: vi.fn().mockImplementation(() => ({
    addConnection: vi.fn().mockReturnValue(true),
    removeConnection: vi.fn().mockReturnValue(true),
    getConnection: vi.fn(),
    getAllConnections: vi.fn().mockReturnValue([]),
    getConnectionCount: vi.fn().mockReturnValue(0),
    closeAllConnections: vi.fn(),
    getConnectionStats: vi.fn().mockReturnValue({
      activeConnections: 0,
      totalConnections: 0,
      cleanedUpConnections: 0,
      averageConnectionDuration: 0
    })
  }))
}));

// Mock the SSEEventEmitter
vi.mock('../SSEEventEmitter', () => ({
  SSEEventEmitter: vi.fn().mockImplementation(() => ({
    formatEvent: vi.fn().mockReturnValue('data: test\n\n')
  }))
}));

describe('SSEServer', () => {
  let sseServer: SSEServer;
  let mockHttpServer: any;
  let config: SSEServerConfig;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock HTTP server
    mockHttpServer = {
      listen: vi.fn(),
      close: vi.fn(),
      on: vi.fn()
    };

    (createServer as Mock).mockReturnValue(mockHttpServer);

    // Default test configuration
    config = {
      port: 3001,
      cors: {
        origin: ['*'],
        credentials: true
      },
      heartbeat: {
        enabled: true,
        interval: 30000
      },
      connection: {
        timeout: 300000,
        maxConnections: 100
      }
    };

    sseServer = new SSEServer(config);
  });

  afterEach(async () => {
    // Clean up any running servers
    if (sseServer) {
      try {
        // Mock the close method to resolve immediately for cleanup
        mockHttpServer.close.mockImplementation((callback: Function) => {
          setTimeout(() => callback(), 0);
        });
        await sseServer.stop();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('should create SSEServer with provided configuration', () => {
      expect(sseServer).toBeInstanceOf(SSEServer);
      expect(createServer).toHaveBeenCalledWith(expect.any(Function));
      expect(mockHttpServer.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockHttpServer.on).toHaveBeenCalledWith('clientError', expect.any(Function));
    });

    it('should initialize with correct default state', () => {
      const status = sseServer.getStatus();
      expect(status.isRunning).toBe(false);
      expect(status.port).toBe(config.port);
      expect(status.connectionCount).toBe(0);
    });
  });

  describe('start', () => {
    it('should start the server successfully', async () => {
      // Mock successful server start
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        setTimeout(() => callback(), 0);
      });

      await sseServer.start();

      expect(mockHttpServer.listen).toHaveBeenCalledWith(config.port, expect.any(Function));
      expect(sseServer.getStatus().isRunning).toBe(true);
    });

    it('should reject if server fails to start', async () => {
      const error = new Error('Port already in use');
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        setTimeout(() => callback(error), 0);
      });

      await expect(sseServer.start()).rejects.toThrow('Port already in use');
      expect(sseServer.getStatus().isRunning).toBe(false);
    });

    it('should throw error if server is already running', async () => {
      // Mock successful server start
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        setTimeout(() => callback(), 0);
      });

      await sseServer.start();
      
      await expect(sseServer.start()).rejects.toThrow('SSE Server is already running');
    });

    it('should start heartbeat when enabled', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        setTimeout(() => callback(), 0);
      });

      await sseServer.start();

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), config.heartbeat.interval);
    });

    it('should not start heartbeat when disabled', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');
      
      const configWithoutHeartbeat = {
        ...config,
        heartbeat: { enabled: false, interval: 30000 }
      };
      
      const serverWithoutHeartbeat = new SSEServer(configWithoutHeartbeat);
      
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        setTimeout(() => callback(), 0);
      });

      await serverWithoutHeartbeat.start();

      // Should only have health monitoring timer (30s interval), not heartbeat timer
      expect(setIntervalSpy).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30000);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      // Start server first
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        setTimeout(() => callback(), 0);
      });
      await sseServer.start();
    });

    it('should stop the server successfully', async () => {
      mockHttpServer.close.mockImplementation((callback: Function) => {
        setTimeout(() => callback(), 0);
      });

      await sseServer.stop();

      expect(mockHttpServer.close).toHaveBeenCalledWith(expect.any(Function));
      expect(sseServer.getStatus().isRunning).toBe(false);
    });

    it('should reject if server fails to stop', async () => {
      const error = new Error('Failed to close server');
      mockHttpServer.close.mockImplementation((callback: Function) => {
        setTimeout(() => callback(error), 0);
      });

      await expect(sseServer.stop()).rejects.toThrow('Failed to close server');
    });

    it('should clear heartbeat interval when stopping', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      mockHttpServer.close.mockImplementation((callback: Function) => {
        setTimeout(() => callback(), 0);
      });

      await sseServer.stop();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should do nothing if server is not running', async () => {
      // First stop the already running server from beforeEach
      mockHttpServer.close.mockImplementation((callback: Function) => {
        setTimeout(() => callback(), 0);
      });
      await sseServer.stop();
      
      // Reset mock call count
      mockHttpServer.close.mockClear();
      
      // Try to stop again - should do nothing
      await sseServer.stop();
      
      expect(mockHttpServer.close).not.toHaveBeenCalled();
    }, 15000);
  });

  describe('broadcast', () => {
    it('should send event to all connections', () => {
      const mockConnections = [
        { id: 'conn1', response: { write: vi.fn() }, lastActivity: new Date() },
        { id: 'conn2', response: { write: vi.fn() }, lastActivity: new Date() }
      ];

      // Mock connection manager to return test connections
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getAllConnections = vi.fn().mockReturnValue(mockConnections);
      mockConnectionManager.getConnection = vi.fn()
        .mockReturnValueOnce(mockConnections[0])
        .mockReturnValueOnce(mockConnections[1]);

      const testEvent = { event: 'test', data: 'test data' };
      sseServer.broadcast(testEvent);

      expect(mockConnections[0].response.write).toHaveBeenCalledWith('data: test\n\n');
      expect(mockConnections[1].response.write).toHaveBeenCalledWith('data: test\n\n');
    });
  });

  describe('sendToConnection', () => {
    it('should send event to specific connection', () => {
      const mockConnection = {
        id: 'test-conn',
        response: { write: vi.fn() },
        lastActivity: new Date()
      };

      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnection = vi.fn().mockReturnValue(mockConnection);

      const testEvent = { event: 'test', data: 'test data' };
      sseServer.sendToConnection('test-conn', testEvent);

      expect(mockConnection.response.write).toHaveBeenCalledWith('data: test\n\n');
    });

    it('should handle connection not found', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnection = vi.fn().mockReturnValue(undefined);

      const testEvent = { event: 'test', data: 'test data' };
      sseServer.sendToConnection('nonexistent', testEvent);

      expect(consoleSpy).toHaveBeenCalledWith('Connection nonexistent not found');
    });

    it('should handle write errors and remove connection', () => {
      const mockConnection = {
        id: 'test-conn',
        response: { 
          write: vi.fn().mockImplementation(() => {
            throw new Error('Connection closed');
          })
        },
        lastActivity: new Date()
      };

      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnection = vi.fn().mockReturnValue(mockConnection);
      mockConnectionManager.removeConnection = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const testEvent = { event: 'test', data: 'test data' };
      sseServer.sendToConnection('test-conn', testEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error sending event to connection test-conn:',
        expect.any(Error)
      );
      expect(mockConnectionManager.removeConnection).toHaveBeenCalledWith('test-conn');
    });
  });

  describe('getStatus', () => {
    it('should return correct status information', () => {
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(5);

      const status = sseServer.getStatus();

      expect(status).toEqual({
        isRunning: false,
        connectionCount: 5,
        port: config.port,
        heartbeat: {
          enabled: true,
          interval: 30000,
          sent: 0,
          lastSent: null,
          errors: 0
        },
        health: {
          connectionStats: {
            activeConnections: 0,
            totalConnections: 0,
            cleanedUpConnections: 0,
            averageConnectionDuration: 0
          },
          uptime: expect.any(Number)
        }
      });
    });
  });

  describe('HTTP request handling', () => {
    let mockReq: Partial<IncomingMessage>;
    let mockRes: Partial<ServerResponse>;
    let requestHandler: Function;

    beforeEach(() => {
      // Get the request handler that was passed to createServer
      requestHandler = (createServer as Mock).mock.calls[0][0];

      mockReq = {
        method: 'GET',
        url: '/events',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
        on: vi.fn()
      };

      mockRes = {
        writeHead: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
        setHeader: vi.fn()
      };
    });

    it('should handle CORS preflight requests', () => {
      const configWithSpecificOrigin = {
        ...config,
        cors: { origin: ['http://localhost:3000'], credentials: true }
      };
      const serverWithSpecificOrigin = new SSEServer(configWithSpecificOrigin);
      const specificRequestHandler = (createServer as Mock).mock.calls[1][0];
      
      mockReq.method = 'OPTIONS';
      mockReq.headers = { origin: 'http://localhost:3000' };

      specificRequestHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
      expect(mockRes.writeHead).toHaveBeenCalledWith(200);
      expect(mockRes.end).toHaveBeenCalled();
    });

    it('should reject non-GET requests for SSE endpoints', () => {
      mockReq.method = 'POST';
      mockReq.url = '/events';

      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(405, { 'Allow': 'GET' });
      expect(mockRes.end).toHaveBeenCalledWith('Method Not Allowed');
    });

    it('should handle SSE connection establishment', () => {
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(0);
      mockConnectionManager.addConnection = vi.fn().mockReturnValue(true);

      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      expect(mockConnectionManager.addConnection).toHaveBeenCalled();
    });

    it('should reject connections when at capacity', () => {
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(config.connection.maxConnections);

      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(503, { 'Content-Type': 'text/plain' });
      expect(mockRes.end).toHaveBeenCalledWith('Server at capacity');
    });

    it('should handle health check requests', () => {
      mockReq.url = '/health';
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(3);

      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' });
      expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({
        isRunning: false,
        connectionCount: 3,
        port: config.port,
        heartbeat: {
          enabled: true,
          interval: 30000,
          sent: 0,
          lastSent: null,
          errors: 0
        },
        health: {
          connectionStats: {
            activeConnections: 0,
            totalConnections: 0,
            cleanedUpConnections: 0,
            averageConnectionDuration: 0
          },
          uptime: expect.any(Number)
        }
      }));
    });

    it('should return 404 for unknown endpoints', () => {
      mockReq.url = '/unknown';

      requestHandler(mockReq, mockRes);

      expect(mockRes.writeHead).toHaveBeenCalledWith(404);
      expect(mockRes.end).toHaveBeenCalledWith('Not Found');
    });

    it('should set CORS headers correctly', () => {
      const configWithSpecificOrigin = {
        ...config,
        cors: { origin: ['http://localhost:3000'], credentials: true }
      };
      const serverWithSpecificOrigin = new SSEServer(configWithSpecificOrigin);
      const specificRequestHandler = (createServer as Mock).mock.calls[1][0];
      
      mockReq.headers = { origin: 'http://localhost:3000' };

      specificRequestHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://localhost:3000');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET, OPTIONS');
    });

    it('should handle wildcard CORS origin', () => {
      mockReq.headers = { origin: 'http://example.com' };

      requestHandler(mockReq, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    });
  });

  describe('error handling', () => {
    it('should handle server errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Server error');

      // Trigger server error
      const errorHandler = mockHttpServer.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(error);

      expect(consoleSpy).toHaveBeenCalledWith('SSE Server error:', error);
    });

    it('should handle client errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSocket = { destroy: vi.fn() };
      const error = new Error('Client error');

      // Trigger client error
      const clientErrorHandler = mockHttpServer.on.mock.calls.find(call => call[0] === 'clientError')[1];
      clientErrorHandler(error, mockSocket);

      expect(consoleSpy).toHaveBeenCalledWith('SSE Client error:', error);
      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });
});