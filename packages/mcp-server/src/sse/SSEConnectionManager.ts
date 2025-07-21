/**
 * SSE Connection Manager for handling connection lifecycle and cleanup
 */

import { SSEConnection } from './types';

/**
 * Connection manager statistics interface
 */
export interface ConnectionStats {
  /** Total number of active connections */
  activeConnections: number;
  /** Total connections created since startup */
  totalConnections: number;
  /** Number of connections cleaned up due to inactivity */
  cleanedUpConnections: number;
  /** Average connection duration in milliseconds */
  averageConnectionDuration: number;
}

/**
 * Connection manager configuration
 */
export interface ConnectionManagerConfig {
  /** Maximum number of concurrent connections */
  maxConnections: number;
  /** Connection timeout in milliseconds */
  connectionTimeout: number;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
  /** Maximum connections per IP address */
  maxConnectionsPerIP: number;
}

/**
 * SSE Connection Manager class for managing active connections
 */
export class SSEConnectionManager {
  private connections: Map<string, SSEConnection> = new Map();
  private connectionsByIP: Map<string, Set<string>> = new Map();
  private connectionStats: ConnectionStats = {
    activeConnections: 0,
    totalConnections: 0,
    cleanedUpConnections: 0,
    averageConnectionDuration: 0
  };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private connectionStartTimes: Map<string, Date> = new Map();

  constructor(private config: ConnectionManagerConfig) {
    this.startCleanupTimer();
  }

  /**
   * Add a new connection to the manager
   */
  addConnection(connection: SSEConnection): boolean {
    // Check if we've reached the maximum number of connections
    if (this.connections.size >= this.config.maxConnections) {
      return false;
    }

    // Extract IP from connection metadata if available
    const clientIP = connection.metadata.clientIP as string;
    if (clientIP && this.isIPLimitExceeded(clientIP)) {
      return false;
    }

    // Add connection
    this.connections.set(connection.id, connection);
    this.connectionStartTimes.set(connection.id, new Date());
    
    // Track by IP if available
    if (clientIP) {
      if (!this.connectionsByIP.has(clientIP)) {
        this.connectionsByIP.set(clientIP, new Set());
      }
      this.connectionsByIP.get(clientIP)!.add(connection.id);
    }

    // Update statistics
    this.connectionStats.activeConnections = this.connections.size;
    this.connectionStats.totalConnections++;

    return true;
  }

  /**
   * Remove a connection from the manager
   */
  removeConnection(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    // Update connection duration statistics
    const startTime = this.connectionStartTimes.get(connectionId);
    if (startTime) {
      const duration = Date.now() - startTime.getTime();
      this.updateAverageConnectionDuration(duration);
      this.connectionStartTimes.delete(connectionId);
    }

    // Remove from IP tracking
    const clientIP = connection.metadata.clientIP as string;
    if (clientIP) {
      const ipConnections = this.connectionsByIP.get(clientIP);
      if (ipConnections) {
        ipConnections.delete(connectionId);
        if (ipConnections.size === 0) {
          this.connectionsByIP.delete(clientIP);
        }
      }
    }

    // Close the connection response if still open
    if (!connection.response.destroyed) {
      connection.response.end();
    }

    // Remove from connections map
    this.connections.delete(connectionId);
    
    // Update statistics
    this.connectionStats.activeConnections = this.connections.size;

    return true;
  }

  /**
   * Get a connection by ID
   */
  getConnection(connectionId: string): SSEConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all active connections
   */
  getAllConnections(): SSEConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections by subscription
   */
  getConnectionsBySubscription(eventType: string): SSEConnection[] {
    return Array.from(this.connections.values()).filter(
      connection => connection.subscriptions.has(eventType)
    );
  }

  /**
   * Update connection activity timestamp
   */
  updateConnectionActivity(connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    connection.lastActivity = new Date();
    return true;
  }

  /**
   * Clean up idle connections based on timeout
   */
  cleanupIdleConnections(): number {
    const now = new Date();
    const timeoutMs = this.config.connectionTimeout;
    const connectionsToRemove: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      const timeSinceActivity = now.getTime() - connection.lastActivity.getTime();
      
      if (timeSinceActivity > timeoutMs) {
        connectionsToRemove.push(connectionId);
      }
    }

    // Remove idle connections
    let cleanedCount = 0;
    for (const connectionId of connectionsToRemove) {
      if (this.removeConnection(connectionId)) {
        cleanedCount++;
      }
    }

    // Update cleanup statistics
    this.connectionStats.cleanedUpConnections += cleanedCount;

    return cleanedCount;
  }

  /**
   * Get current connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): ConnectionStats {
    return { ...this.connectionStats };
  }

  /**
   * Check if a connection exists
   */
  hasConnection(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  /**
   * Get connections for a specific IP address
   */
  getConnectionsForIP(clientIP: string): string[] {
    const ipConnections = this.connectionsByIP.get(clientIP);
    return ipConnections ? Array.from(ipConnections) : [];
  }

  /**
   * Close all active connections
   */
  closeAllConnections(): void {
    const connectionIds = Array.from(this.connections.keys());
    for (const connectionId of connectionIds) {
      this.removeConnection(connectionId);
    }
  }

  /**
   * Shutdown the connection manager and clean up all connections
   */
  shutdown(): void {
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Close all connections
    this.closeAllConnections();

    // Clear all maps
    this.connections.clear();
    this.connectionsByIP.clear();
    this.connectionStartTimes.clear();
  }

  /**
   * Check if IP has exceeded connection limit
   */
  private isIPLimitExceeded(clientIP: string): boolean {
    const ipConnections = this.connectionsByIP.get(clientIP);
    return ipConnections ? ipConnections.size >= this.config.maxConnectionsPerIP : false;
  }

  /**
   * Start the cleanup timer for idle connections
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleConnections();
    }, this.config.cleanupInterval);
  }

  /**
   * Update average connection duration statistics
   */
  private updateAverageConnectionDuration(newDuration: number): void {
    const currentAvg = this.connectionStats.averageConnectionDuration;
    const totalConnections = this.connectionStats.totalConnections;
    
    // Calculate new average using incremental formula
    this.connectionStats.averageConnectionDuration = 
      (currentAvg * (totalConnections - 1) + newDuration) / totalConnections;
  }
}