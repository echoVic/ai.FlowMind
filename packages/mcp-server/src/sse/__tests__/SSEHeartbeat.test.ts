/**
 * Unit tests for SSE heartbeat and keep-alive functionality
 */

import { createServer } from 'http';
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
    cleanupIdleConnections: vi.fn().mockReturnValue(0),
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
    formatEvent: vi.fn().mockReturnValue('data: {"timestamp":"2023-01-01T00:00:00.000Z","connectionCount":0,"serverUptime":0}\n\n')
  }))
}));

describe('SSE Heartbeat and Keep-Alive', () => {
  let sseServer: SSEServer;
  let mockHttpServer: any;
  let config: SSEServerConfig;

  beforeEach(() => {
    // Reset all mocks and timers
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Create mock HTTP server
    mockHttpServer = {
      listen: vi.fn(),
      close: vi.fn(),
      on: vi.fn()
    };

    (createServer as Mock).mockReturnValue(mockHttpServer);

    // Configuration with heartbeat enabled
    config = {
      port: 3001,
      cors: {
        origin: ['*'],
        credentials: true
      },
      heartbeat: {
        enabled: true,
        interval: 30000 // 30 seconds
      },
      connection: {
        timeout: 300000,
        maxConnections: 100
      }
    };

    sseServer = new SSEServer(config);
  });

  afterEach(async () => {
    vi.useRealTimers();
    vi.clearAllTimers();
    
    // Clean up any running servers
    if (sseServer) {
      try {
        mockHttpServer.close.mockImplementation((callback: Function) => {
          setTimeout(() => callback(), 0);
        });
        await sseServer.stop();
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  });

  describe('heartbeat configuration', () => {
    it('should initialize with heartbeat enabled', () => {
      const status = sseServer.getStatus();
      expect(status.heartbeat.enabled).toBe(true);
      expect(status.heartbeat.interval).toBe(30000);
      expect(status.heartbeat.sent).toBe(0);
      expect(status.heartbeat.lastSent).toBeNull();
      expect(status.heartbeat.errors).toBe(0);
    });

    it('should initialize with heartbeat disabled', () => {
      const configDisabled = {
        ...config,
        heartbeat: { enabled: false, interval: 30000 }
      };
      
      const serverDisabled = new SSEServer(configDisabled);
      const status = serverDisabled.getStatus();
      
      expect(status.heartbeat.enabled).toBe(false);
      expect(status.heartbeat.interval).toBe(30000);
    });

    it('should support custom heartbeat intervals', () => {
      const customConfig = {
        ...config,
        heartbeat: { enabled: true, interval: 15000 }
      };
      
      const customServer = new SSEServer(customConfig);
      const status = customServer.getStatus();
      
      expect(status.heartbeat.interval).toBe(15000);
    });
  });

  describe('heartbeat lifecycle', () => {
    beforeEach(async () => {
      // Mock successful server start
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        callback();
      });
      
      await sseServer.start();
    }, 15000);

    it('should start heartbeat when server starts', async () => {
      const status = sseServer.getStatus();
      expect(status.heartbeat.enabled).toBe(true);
      
      // Verify setInterval was called with correct interval
      expect(vi.getTimerCount()).toBeGreaterThan(0);
    });

    it('should stop heartbeat when server stops', async () => {
      mockHttpServer.close.mockImplementation((callback: Function) => {
        setTimeout(() => callback(), 0);
      });

      await sseServer.stop();
      
      // All timers should be cleared
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should not start heartbeat when disabled', async () => {
      const configDisabled = {
        ...config,
        heartbeat: { enabled: false, interval: 30000 }
      };
      
      const serverDisabled = new SSEServer(configDisabled);
      
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        callback();
      });
      
      await serverDisabled.start();
      
      // Should only have health monitoring timer, not heartbeat timer
      expect(vi.getTimerCount()).toBe(1);
    });
  });

  describe('heartbeat emission', () => {
    beforeEach(async () => {
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        callback();
      });
      
      await sseServer.start();
    }, 15000);

    it('should send heartbeat events at configured intervals', () => {
      const mockConnections = [
        { 
          id: 'conn1', 
          response: { write: vi.fn() }, 
          lastActivity: new Date(),
          subscriptions: new Set(),
          metadata: {}
        },
        { 
          id: 'conn2', 
          response: { write: vi.fn() }, 
          lastActivity: new Date(),
          subscriptions: new Set(),
          metadata: {}
        }
      ];

      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getAllConnections = vi.fn().mockReturnValue(mockConnections);
      mockConnectionManager.getConnection = vi.fn()
        .mockReturnValueOnce(mockConnections[0])
        .mockReturnValueOnce(mockConnections[1]);
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(2);

      // Fast-forward time to trigger heartbeat
      vi.advanceTimersByTime(30000);

      expect(mockConnections[0].response.write).toHaveBeenCalled();
      expect(mockConnections[1].response.write).toHaveBeenCalled();
      
      const status = sseServer.getStatus();
      expect(status.heartbeat.sent).toBe(1);
      expect(status.heartbeat.lastSent).toBeInstanceOf(Date);
    });

    it('should include connection count in heartbeat data', () => {
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getAllConnections = vi.fn().mockReturnValue([]);
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(5);

      // Fast-forward time to trigger heartbeat
      vi.advanceTimersByTime(30000);

      const mockEventEmitter = sseServer['eventEmitter'];
      expect(mockEventEmitter.formatEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'heartbeat',
          data: expect.objectContaining({
            connectionCount: 5,
            timestamp: expect.any(String),
            serverUptime: expect.any(Number)
          })
        })
      );
    });

    it('should handle heartbeat errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getAllConnections = vi.fn().mockImplementation(() => {
        throw new Error('Connection manager error');
      });

      // Fast-forward time to trigger heartbeat
      vi.advanceTimersByTime(30000);

      expect(consoleSpy).toHaveBeenCalledWith('Error sending heartbeat:', expect.any(Error));
      
      const status = sseServer.getStatus();
      expect(status.heartbeat.errors).toBe(1);
    });

    it('should increment heartbeat statistics correctly', () => {
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getAllConnections = vi.fn().mockReturnValue([]);
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(0);

      // Trigger multiple heartbeats
      vi.advanceTimersByTime(30000); // First heartbeat
      vi.advanceTimersByTime(30000); // Second heartbeat
      vi.advanceTimersByTime(30000); // Third heartbeat

      const status = sseServer.getStatus();
      expect(status.heartbeat.sent).toBe(3);
      expect(status.heartbeat.lastSent).toBeInstanceOf(Date);
    });
  });

  describe('connection health monitoring', () => {
    beforeEach(async () => {
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        callback();
      });
      
      await sseServer.start();
    }, 15000);

    it('should start health monitoring when server starts', () => {
      // Should have both heartbeat and health monitoring timers
      expect(vi.getTimerCount()).toBe(2);
    });

    it('should perform health checks at regular intervals', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(3);
      mockConnectionManager.cleanupIdleConnections = vi.fn().mockReturnValue(1);
      mockConnectionManager.getConnectionStats = vi.fn().mockReturnValue({
        activeConnections: 3,
        totalConnections: 10,
        cleanedUpConnections: 1,
        averageConnectionDuration: 120000
      });

      // Fast-forward time to trigger health check (30 seconds)
      vi.advanceTimersByTime(30000);

      expect(mockConnectionManager.cleanupIdleConnections).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Health check: 3 active connections')
      );
    });

    it('should log cleanup of idle connections', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.cleanupIdleConnections = vi.fn().mockReturnValue(2);
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(5);
      mockConnectionManager.getConnectionStats = vi.fn().mockReturnValue({
        activeConnections: 5,
        totalConnections: 7,
        cleanedUpConnections: 2,
        averageConnectionDuration: 60000
      });

      // Fast-forward time to trigger health check
      vi.advanceTimersByTime(30000);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Health check: Cleaned up 2 idle connections'
      );
    });

    it('should warn about high connection count', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(85); // 85% of max (100)
      mockConnectionManager.cleanupIdleConnections = vi.fn().mockReturnValue(0);
      mockConnectionManager.getConnectionStats = vi.fn().mockReturnValue({
        activeConnections: 85,
        totalConnections: 85,
        cleanedUpConnections: 0,
        averageConnectionDuration: 180000
      });

      // Fast-forward time to trigger health check
      vi.advanceTimersByTime(30000);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Health check: High connection count (85/100)'
      );
    });

    it('should warn about high heartbeat error count', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Simulate heartbeat errors
      sseServer['heartbeatStats'].errors = 15;
      
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(5);
      mockConnectionManager.cleanupIdleConnections = vi.fn().mockReturnValue(0);
      mockConnectionManager.getConnectionStats = vi.fn().mockReturnValue({
        activeConnections: 5,
        totalConnections: 5,
        cleanedUpConnections: 0,
        averageConnectionDuration: 90000
      });

      // Fast-forward time to trigger health check
      vi.advanceTimersByTime(30000);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Health check: High heartbeat error count (15)'
      );
    });

    it('should handle health check errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnectionCount = vi.fn().mockImplementation(() => {
        throw new Error('Health check error');
      });

      // Fast-forward time to trigger health check
      vi.advanceTimersByTime(30000);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error during health check:',
        expect.any(Error)
      );
    });
  });

  describe('connection health assessment', () => {
    beforeEach(async () => {
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        callback();
      });
      
      await sseServer.start();
    }, 15000);

    it('should identify healthy connections', () => {
      const recentTime = new Date(Date.now() - 10000); // 10 seconds ago
      const mockConnection = {
        id: 'healthy-conn',
        response: { write: vi.fn() },
        lastActivity: recentTime,
        subscriptions: new Set(),
        metadata: {}
      };

      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnection = vi.fn().mockReturnValue(mockConnection);

      const isHealthy = sseServer.isConnectionHealthy('healthy-conn');
      expect(isHealthy).toBe(true);
    });

    it('should identify unhealthy connections', () => {
      const oldTime = new Date(Date.now() - 120000); // 2 minutes ago (> 2x heartbeat interval)
      const mockConnection = {
        id: 'unhealthy-conn',
        response: { write: vi.fn() },
        lastActivity: oldTime,
        subscriptions: new Set(),
        metadata: {}
      };

      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnection = vi.fn().mockReturnValue(mockConnection);

      const isHealthy = sseServer.isConnectionHealthy('unhealthy-conn');
      expect(isHealthy).toBe(false);
    });

    it('should return false for non-existent connections', () => {
      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getConnection = vi.fn().mockReturnValue(undefined);

      const isHealthy = sseServer.isConnectionHealthy('nonexistent-conn');
      expect(isHealthy).toBe(false);
    });
  });

  describe('heartbeat statistics', () => {
    it('should provide accurate heartbeat statistics', () => {
      const stats = sseServer.getHeartbeatStats();
      
      expect(stats).toEqual({
        sent: 0,
        lastSent: null,
        errors: 0,
        enabled: true,
        interval: 30000
      });
    });

    it('should update statistics after heartbeat events', async () => {
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        callback();
      });
      
      await sseServer.start();

      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getAllConnections = vi.fn().mockReturnValue([]);
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(0);

      // Trigger heartbeat
      vi.advanceTimersByTime(30000);

      const stats = sseServer.getHeartbeatStats();
      expect(stats.sent).toBe(1);
      expect(stats.lastSent).toBeInstanceOf(Date);
      expect(stats.errors).toBe(0);
    });

    it('should track heartbeat errors', async () => {
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        callback();
      });
      
      await sseServer.start();

      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getAllConnections = vi.fn().mockImplementation(() => {
        throw new Error('Heartbeat error');
      });

      // Suppress console.error for this test
      vi.spyOn(console, 'error').mockImplementation(() => {});

      // Trigger heartbeat
      vi.advanceTimersByTime(30000);

      const stats = sseServer.getHeartbeatStats();
      expect(stats.errors).toBe(1);
    });
  });

  describe('keep-alive functionality', () => {
    beforeEach(async () => {
      mockHttpServer.listen.mockImplementation((port: number, callback: Function) => {
        callback();
      });
      
      await sseServer.start();
    }, 15000);

    it('should maintain connections with regular heartbeats', () => {
      const mockConnection = {
        id: 'keep-alive-conn',
        response: { write: vi.fn() },
        lastActivity: new Date(),
        subscriptions: new Set(),
        metadata: {}
      };

      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getAllConnections = vi.fn().mockReturnValue([mockConnection]);
      mockConnectionManager.getConnection = vi.fn().mockReturnValue(mockConnection);
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(1);

      // Trigger multiple heartbeats over time
      vi.advanceTimersByTime(30000); // First heartbeat
      vi.advanceTimersByTime(30000); // Second heartbeat
      vi.advanceTimersByTime(30000); // Third heartbeat

      // Connection should receive all heartbeats
      expect(mockConnection.response.write).toHaveBeenCalledTimes(3);
      
      const status = sseServer.getStatus();
      expect(status.heartbeat.sent).toBe(3);
    });

    it('should update connection activity on successful heartbeat', () => {
      const initialTime = new Date(Date.now() - 60000); // 1 minute ago
      const mockConnection = {
        id: 'activity-conn',
        response: { write: vi.fn() },
        lastActivity: initialTime,
        subscriptions: new Set(),
        metadata: {}
      };

      const mockConnectionManager = sseServer['connectionManager'];
      mockConnectionManager.getAllConnections = vi.fn().mockReturnValue([mockConnection]);
      mockConnectionManager.getConnection = vi.fn().mockReturnValue(mockConnection);
      mockConnectionManager.getConnectionCount = vi.fn().mockReturnValue(1);

      // Trigger heartbeat
      vi.advanceTimersByTime(30000);

      // Connection's lastActivity should be updated
      expect(mockConnection.lastActivity.getTime()).toBeGreaterThan(initialTime.getTime());
    });
  });
});