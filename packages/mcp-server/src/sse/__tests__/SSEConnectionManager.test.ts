/**
 * Unit tests for SSEConnectionManager
 */

import { ServerResponse } from 'http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionManagerConfig, SSEConnectionManager } from '../SSEConnectionManager';
import { SSEConnection } from '../types';

// Mock ServerResponse
const createMockResponse = (): ServerResponse => {
  const response = {
    destroyed: false,
    end: vi.fn(),
    write: vi.fn(),
    writeHead: vi.fn(),
    setHeader: vi.fn(),
  } as unknown as ServerResponse;
  
  return response;
};

// Helper function to create test connection
const createTestConnection = (id: string, clientIP?: string): SSEConnection => ({
  id,
  response: createMockResponse(),
  lastActivity: new Date(),
  subscriptions: new Set(['progress', 'result']),
  metadata: clientIP ? { clientIP } : {}
});

// Default test configuration
const defaultConfig: ConnectionManagerConfig = {
  maxConnections: 10,
  connectionTimeout: 30000, // 30 seconds
  cleanupInterval: 10000, // 10 seconds
  maxConnectionsPerIP: 3
};

describe('SSEConnectionManager', () => {
  let manager: SSEConnectionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    manager = new SSEConnectionManager(defaultConfig);
  });

  afterEach(() => {
    manager.shutdown();
    vi.useRealTimers();
  });

  describe('Connection Management', () => {
    it('should add a new connection successfully', () => {
      const connection = createTestConnection('conn1');
      
      const result = manager.addConnection(connection);
      
      expect(result).toBe(true);
      expect(manager.getConnectionCount()).toBe(1);
      expect(manager.hasConnection('conn1')).toBe(true);
    });

    it('should retrieve a connection by ID', () => {
      const connection = createTestConnection('conn1');
      manager.addConnection(connection);
      
      const retrieved = manager.getConnection('conn1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('conn1');
    });

    it('should return undefined for non-existent connection', () => {
      const retrieved = manager.getConnection('nonexistent');
      
      expect(retrieved).toBeUndefined();
    });

    it('should remove a connection successfully', () => {
      const connection = createTestConnection('conn1');
      manager.addConnection(connection);
      
      const result = manager.removeConnection('conn1');
      
      expect(result).toBe(true);
      expect(manager.getConnectionCount()).toBe(0);
      expect(manager.hasConnection('conn1')).toBe(false);
      expect(connection.response.end).toHaveBeenCalled();
    });

    it('should return false when removing non-existent connection', () => {
      const result = manager.removeConnection('nonexistent');
      
      expect(result).toBe(false);
    });

    it('should get all active connections', () => {
      const conn1 = createTestConnection('conn1');
      const conn2 = createTestConnection('conn2');
      
      manager.addConnection(conn1);
      manager.addConnection(conn2);
      
      const allConnections = manager.getAllConnections();
      
      expect(allConnections).toHaveLength(2);
      expect(allConnections.map(c => c.id)).toContain('conn1');
      expect(allConnections.map(c => c.id)).toContain('conn2');
    });
  });

  describe('Connection Limits', () => {
    it('should reject connections when max limit is reached', () => {
      const smallConfig: ConnectionManagerConfig = {
        ...defaultConfig,
        maxConnections: 2
      };
      manager.shutdown();
      manager = new SSEConnectionManager(smallConfig);

      // Add connections up to limit
      expect(manager.addConnection(createTestConnection('conn1'))).toBe(true);
      expect(manager.addConnection(createTestConnection('conn2'))).toBe(true);
      
      // Third connection should be rejected
      expect(manager.addConnection(createTestConnection('conn3'))).toBe(false);
      expect(manager.getConnectionCount()).toBe(2);
    });

    it('should enforce per-IP connection limits', () => {
      const config: ConnectionManagerConfig = {
        ...defaultConfig,
        maxConnectionsPerIP: 2
      };
      manager.shutdown();
      manager = new SSEConnectionManager(config);

      const ip = '192.168.1.1';
      
      // Add connections up to IP limit
      expect(manager.addConnection(createTestConnection('conn1', ip))).toBe(true);
      expect(manager.addConnection(createTestConnection('conn2', ip))).toBe(true);
      
      // Third connection from same IP should be rejected
      expect(manager.addConnection(createTestConnection('conn3', ip))).toBe(false);
      
      // Connection from different IP should be allowed
      expect(manager.addConnection(createTestConnection('conn4', '192.168.1.2'))).toBe(true);
    });

    it('should track connections by IP address', () => {
      const ip1 = '192.168.1.1';
      const ip2 = '192.168.1.2';
      
      manager.addConnection(createTestConnection('conn1', ip1));
      manager.addConnection(createTestConnection('conn2', ip1));
      manager.addConnection(createTestConnection('conn3', ip2));
      
      const ip1Connections = manager.getConnectionsForIP(ip1);
      const ip2Connections = manager.getConnectionsForIP(ip2);
      
      expect(ip1Connections).toHaveLength(2);
      expect(ip2Connections).toHaveLength(1);
      expect(ip1Connections).toContain('conn1');
      expect(ip1Connections).toContain('conn2');
      expect(ip2Connections).toContain('conn3');
    });
  });

  describe('Subscription Management', () => {
    it('should get connections by subscription', () => {
      const conn1 = createTestConnection('conn1');
      conn1.subscriptions = new Set(['progress', 'result']);
      
      const conn2 = createTestConnection('conn2');
      conn2.subscriptions = new Set(['error']);
      
      const conn3 = createTestConnection('conn3');
      conn3.subscriptions = new Set(['progress', 'error']);
      
      manager.addConnection(conn1);
      manager.addConnection(conn2);
      manager.addConnection(conn3);
      
      const progressConnections = manager.getConnectionsBySubscription('progress');
      const errorConnections = manager.getConnectionsBySubscription('error');
      const resultConnections = manager.getConnectionsBySubscription('result');
      
      expect(progressConnections).toHaveLength(2);
      expect(errorConnections).toHaveLength(2);
      expect(resultConnections).toHaveLength(1);
      
      expect(progressConnections.map(c => c.id)).toContain('conn1');
      expect(progressConnections.map(c => c.id)).toContain('conn3');
    });
  });

  describe('Activity Tracking', () => {
    it('should update connection activity timestamp', () => {
      const connection = createTestConnection('conn1');
      const originalActivity = new Date(Date.now() - 5000); // 5 seconds ago
      connection.lastActivity = originalActivity;
      
      manager.addConnection(connection);
      
      // Advance time
      vi.advanceTimersByTime(1000);
      
      const result = manager.updateConnectionActivity('conn1');
      const updatedConnection = manager.getConnection('conn1');
      
      expect(result).toBe(true);
      expect(updatedConnection?.lastActivity.getTime()).toBeGreaterThan(originalActivity.getTime());
    });

    it('should return false when updating activity for non-existent connection', () => {
      const result = manager.updateConnectionActivity('nonexistent');
      
      expect(result).toBe(false);
    });
  });

  describe('Idle Connection Cleanup', () => {
    it('should clean up idle connections', () => {
      const config: ConnectionManagerConfig = {
        ...defaultConfig,
        connectionTimeout: 5000 // 5 seconds
      };
      manager.shutdown();
      manager = new SSEConnectionManager(config);

      // Add connections with different activity times
      const activeConnection = createTestConnection('active');
      const idleConnection = createTestConnection('idle');
      
      // Set idle connection to be older than timeout
      idleConnection.lastActivity = new Date(Date.now() - 10000); // 10 seconds ago
      
      manager.addConnection(activeConnection);
      manager.addConnection(idleConnection);
      
      expect(manager.getConnectionCount()).toBe(2);
      
      // Run cleanup
      const cleanedCount = manager.cleanupIdleConnections();
      
      expect(cleanedCount).toBe(1);
      expect(manager.getConnectionCount()).toBe(1);
      expect(manager.hasConnection('active')).toBe(true);
      expect(manager.hasConnection('idle')).toBe(false);
    });

    it('should automatically run cleanup on timer', () => {
      const config: ConnectionManagerConfig = {
        ...defaultConfig,
        connectionTimeout: 5000,
        cleanupInterval: 1000 // 1 second
      };
      manager.shutdown();
      manager = new SSEConnectionManager(config);

      // Add idle connection
      const idleConnection = createTestConnection('idle');
      idleConnection.lastActivity = new Date(Date.now() - 10000);
      manager.addConnection(idleConnection);
      
      expect(manager.getConnectionCount()).toBe(1);
      
      // Advance timer to trigger cleanup
      vi.advanceTimersByTime(1000);
      
      expect(manager.getConnectionCount()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track connection statistics', () => {
      const conn1 = createTestConnection('conn1');
      const conn2 = createTestConnection('conn2');
      
      manager.addConnection(conn1);
      manager.addConnection(conn2);
      
      let stats = manager.getConnectionStats();
      expect(stats.activeConnections).toBe(2);
      expect(stats.totalConnections).toBe(2);
      expect(stats.cleanedUpConnections).toBe(0);
      
      // Remove one connection
      manager.removeConnection('conn1');
      
      stats = manager.getConnectionStats();
      expect(stats.activeConnections).toBe(1);
      expect(stats.totalConnections).toBe(2); // Total doesn't decrease
    });

    it('should track cleanup statistics', () => {
      const config: ConnectionManagerConfig = {
        ...defaultConfig,
        connectionTimeout: 5000
      };
      manager.shutdown();
      manager = new SSEConnectionManager(config);

      // Add idle connection
      const idleConnection = createTestConnection('idle');
      idleConnection.lastActivity = new Date(Date.now() - 10000);
      manager.addConnection(idleConnection);
      
      manager.cleanupIdleConnections();
      
      const stats = manager.getConnectionStats();
      expect(stats.cleanedUpConnections).toBe(1);
    });

    it('should calculate average connection duration', () => {
      // Add and immediately remove connections to test duration calculation
      const conn1 = createTestConnection('conn1');
      manager.addConnection(conn1);
      
      // Advance time by 2 seconds
      vi.advanceTimersByTime(2000);
      manager.removeConnection('conn1');
      
      const conn2 = createTestConnection('conn2');
      manager.addConnection(conn2);
      
      // Advance time by 4 seconds
      vi.advanceTimersByTime(4000);
      manager.removeConnection('conn2');
      
      const stats = manager.getConnectionStats();
      expect(stats.averageConnectionDuration).toBe(3000); // (2000 + 4000) / 2
    });
  });

  describe('Shutdown', () => {
    it('should close all connections on shutdown', () => {
      const conn1 = createTestConnection('conn1');
      const conn2 = createTestConnection('conn2');
      
      manager.addConnection(conn1);
      manager.addConnection(conn2);
      
      expect(manager.getConnectionCount()).toBe(2);
      
      manager.shutdown();
      
      expect(manager.getConnectionCount()).toBe(0);
      expect(conn1.response.end).toHaveBeenCalled();
      expect(conn2.response.end).toHaveBeenCalled();
    });

    it('should stop cleanup timer on shutdown', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      manager.shutdown();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle connections without IP metadata', () => {
      const connection = createTestConnection('conn1');
      delete connection.metadata.clientIP;
      
      const result = manager.addConnection(connection);
      
      expect(result).toBe(true);
      expect(manager.getConnectionsForIP('any-ip')).toHaveLength(0);
    });

    it('should handle destroyed response objects gracefully', () => {
      const connection = createTestConnection('conn1');
      connection.response.destroyed = true;
      
      manager.addConnection(connection);
      const result = manager.removeConnection('conn1');
      
      expect(result).toBe(true);
      expect(connection.response.end).not.toHaveBeenCalled();
    });

    it('should handle empty subscription sets', () => {
      const connection = createTestConnection('conn1');
      connection.subscriptions = new Set();
      
      manager.addConnection(connection);
      const connections = manager.getConnectionsBySubscription('any-event');
      
      expect(connections).toHaveLength(0);
    });
  });
});