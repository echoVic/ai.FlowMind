/**
 * SSE Server implementation for handling Server-Sent Events connections
 */

import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { parse } from 'url';
import { SSEConnectionManager } from './SSEConnectionManager';
import { SSEEventEmitter } from './SSEEventEmitter';
import { SSEConnection, SSEEvent, SSEServerConfig } from './types';

/**
 * SSE Server class that manages HTTP server for Server-Sent Events
 */
export class SSEServer {
  private httpServer: Server;
  private connectionManager: SSEConnectionManager;
  private eventEmitter: SSEEventEmitter;
  private config: SSEServerConfig;
  private isRunning: boolean = false;
  private startTime: Date | null = null;
  private heartbeatInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private heartbeatStats = {
    sent: 0,
    lastSent: null as Date | null,
    errors: 0
  };

  constructor(config: SSEServerConfig) {
    this.config = config;
    this.connectionManager = new SSEConnectionManager({
      maxConnections: config.connection.maxConnections,
      connectionTimeout: config.connection.timeout,
      cleanupInterval: 30000, // 30 seconds
      maxConnectionsPerIP: 10 // Default limit per IP
    });
    this.eventEmitter = new SSEEventEmitter('server', 'broadcast');
    this.httpServer = createServer(this.handleRequest.bind(this));
    
    // Set up server event handlers
    this.httpServer.on('error', this.handleServerError.bind(this));
    this.httpServer.on('clientError', this.handleClientError.bind(this));
  }

  /**
   * Start the SSE server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('SSE Server is already running');
    }

    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.config.port, (error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        this.isRunning = true;
        this.startTime = new Date();
        console.log(`SSE Server started on port ${this.config.port}`);

        // Start heartbeat if enabled
        if (this.config.heartbeat.enabled) {
          this.startHeartbeat();
        }

        // Start connection health monitoring
        this.startHealthMonitoring();

        resolve();
      });
    });
  }

  /**
   * Stop the SSE server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Stop heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Close all connections
    this.connectionManager.closeAllConnections();

    return new Promise((resolve, reject) => {
      this.httpServer.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        this.isRunning = false;
        this.startTime = null;
        console.log('SSE Server stopped');
        resolve();
      });
    });
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event: SSEEvent): void {
    const connections = this.connectionManager.getAllConnections();
    connections.forEach(connection => {
      this.sendToConnection(connection.id, event);
    });
  }

  /**
   * Send an event to a specific connection
   */
  sendToConnection(connectionId: string, event: SSEEvent): void {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) {
      console.warn(`Connection ${connectionId} not found`);
      return;
    }

    try {
      const formattedEvent = this.eventEmitter.formatEvent(event);
      connection.response.write(formattedEvent);
      
      // Update last activity
      connection.lastActivity = new Date();
    } catch (error) {
      console.error(`Error sending event to connection ${connectionId}:`, error);
      this.connectionManager.removeConnection(connectionId);
    }
  }

  /**
   * Get server status information
   */
  getStatus(): { 
    isRunning: boolean; 
    connectionCount: number; 
    port: number;
    heartbeat: {
      enabled: boolean;
      interval: number;
      sent: number;
      lastSent: Date | null;
      errors: number;
    };
    health: {
      connectionStats: any;
      uptime: number;
    };
  } {
    return {
      isRunning: this.isRunning,
      connectionCount: this.connectionManager.getConnectionCount(),
      port: this.config.port,
      heartbeat: {
        enabled: this.config.heartbeat.enabled,
        interval: this.config.heartbeat.interval,
        sent: this.heartbeatStats.sent,
        lastSent: this.heartbeatStats.lastSent,
        errors: this.heartbeatStats.errors
      },
      health: {
        connectionStats: this.connectionManager.getConnectionStats(),
        uptime: this.isRunning && this.startTime ? Date.now() - this.startTime.getTime() : 0
      }
    };
  }

  /**
   * Handle incoming HTTP requests
   */
  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = parse(req.url || '', true);
    
    // Set CORS headers
    this.setCORSHeaders(res, req);

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Only allow GET requests for SSE
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Allow': 'GET' });
      res.end('Method Not Allowed');
      return;
    }

    // Check if this is an SSE endpoint
    if (url.pathname === '/events') {
      this.handleSSEConnection(req, res);
    } else if (url.pathname === '/health') {
      this.handleHealthCheck(req, res);
    } else if (url.pathname?.startsWith('/stream/')) {
      this.handleStreamingRequest(req, res, url);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }

  /**
   * Handle SSE connection establishment
   */
  private handleSSEConnection(req: IncomingMessage, res: ServerResponse): void {
    // Check connection limits
    if (this.connectionManager.getConnectionCount() >= this.config.connection.maxConnections) {
      res.writeHead(503, { 'Content-Type': 'text/plain' });
      res.end('Server at capacity');
      return;
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Create connection
    const connectionId = this.generateConnectionId();
    const connection: SSEConnection = {
      id: connectionId,
      response: res,
      lastActivity: new Date(),
      subscriptions: new Set(),
      metadata: {
        userAgent: req.headers['user-agent'] || 'unknown',
        remoteAddress: req.socket.remoteAddress || 'unknown'
      }
    };

    // Add connection to manager
    this.connectionManager.addConnection(connection);

    // Send initial connection event
    this.sendToConnection(connectionId, {
      event: 'connected',
      data: { connectionId, timestamp: new Date().toISOString() }
    });

    // Handle connection close
    req.on('close', () => {
      this.connectionManager.removeConnection(connectionId);
    });

    req.on('error', (error) => {
      console.error(`Connection error for ${connectionId}:`, error);
      this.connectionManager.removeConnection(connectionId);
    });

    console.log(`SSE connection established: ${connectionId}`);
  }

  /**
   * Handle health check requests
   */
  private handleHealthCheck(req: IncomingMessage, res: ServerResponse): void {
    const status = this.getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  }

  /**
   * Handle streaming requests for MCP operations
   */
  private handleStreamingRequest(req: IncomingMessage, res: ServerResponse, url: any): void {
    // For streaming requests, we need to establish an SSE connection first
    // and then process the request with streaming updates
    
    // Extract operation from URL path
    const pathParts = url.pathname.split('/');
    const operation = pathParts[2]; // /stream/{operation}
    
    if (!['validate', 'optimize', 'templates', 'convert'].includes(operation)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid streaming operation' }));
      return;
    }

    // For now, redirect to establish SSE connection first
    // In a full implementation, this would handle POST requests with operation data
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      message: 'Streaming endpoint available',
      operation,
      instructions: 'Connect to /events endpoint first, then send operation data'
    }));
  }

  /**
   * Set CORS headers on response
   */
  private setCORSHeaders(res: ServerResponse, req: IncomingMessage): void {
    const origin = req.headers.origin;
    
    // Check if origin is allowed - check specific origins first, then wildcard
    if (origin && this.config.cors.origin.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (this.config.cors.origin.includes('*')) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    if (this.config.cors.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeat.interval);
    
    console.log(`SSE heartbeat started with ${this.config.heartbeat.interval}ms interval`);
  }

  /**
   * Send heartbeat event to all connections
   */
  private sendHeartbeat(): void {
    try {
      const heartbeatEvent = {
        event: 'heartbeat',
        data: { 
          timestamp: new Date().toISOString(),
          connectionCount: this.connectionManager.getConnectionCount(),
          serverUptime: this.isRunning && this.startTime ? Date.now() - this.startTime.getTime() : 0
        }
      };

      this.broadcast(heartbeatEvent);
      
      // Update heartbeat statistics
      this.heartbeatStats.sent++;
      this.heartbeatStats.lastSent = new Date();
      
      console.log(`Heartbeat sent to ${this.connectionManager.getConnectionCount()} connections`);
    } catch (error) {
      this.heartbeatStats.errors++;
      console.error('Error sending heartbeat:', error);
    }
  }

  /**
   * Start connection health monitoring
   */
  private startHealthMonitoring(): void {
    // Monitor connection health every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    console.log('SSE connection health monitoring started');
  }

  /**
   * Perform connection health check
   */
  private performHealthCheck(): void {
    try {
      const connectionCount = this.connectionManager.getConnectionCount();
      const connectionStats = this.connectionManager.getConnectionStats();
      
      // Clean up idle connections
      const cleanedConnections = this.connectionManager.cleanupIdleConnections();
      
      if (cleanedConnections > 0) {
        console.log(`Health check: Cleaned up ${cleanedConnections} idle connections`);
      }
      
      // Log health status
      console.log(`Health check: ${connectionCount} active connections, avg duration: ${Math.round(connectionStats.averageConnectionDuration / 1000)}s`);
      
      // Check for potential issues
      if (connectionCount > this.config.connection.maxConnections * 0.8) {
        console.warn(`Health check: High connection count (${connectionCount}/${this.config.connection.maxConnections})`);
      }
      
      if (this.heartbeatStats.errors > 10) {
        console.warn(`Health check: High heartbeat error count (${this.heartbeatStats.errors})`);
      }
      
    } catch (error) {
      console.error('Error during health check:', error);
    }
  }

  /**
   * Check if a connection is healthy
   */
  isConnectionHealthy(connectionId: string): boolean {
    const connection = this.connectionManager.getConnection(connectionId);
    if (!connection) {
      return false;
    }
    
    const now = new Date();
    const timeSinceActivity = now.getTime() - connection.lastActivity.getTime();
    
    // Consider connection unhealthy if no activity for more than 2x heartbeat interval
    const healthThreshold = this.config.heartbeat.interval * 2;
    
    return timeSinceActivity < healthThreshold;
  }

  /**
   * Get heartbeat statistics
   */
  getHeartbeatStats(): {
    sent: number;
    lastSent: Date | null;
    errors: number;
    enabled: boolean;
    interval: number;
  } {
    return {
      sent: this.heartbeatStats.sent,
      lastSent: this.heartbeatStats.lastSent,
      errors: this.heartbeatStats.errors,
      enabled: this.config.heartbeat.enabled,
      interval: this.config.heartbeat.interval
    };
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle server errors
   */
  private handleServerError(error: Error): void {
    console.error('SSE Server error:', error);
  }

  /**
   * Handle client errors
   */
  private handleClientError(error: Error, socket: any): void {
    console.error('SSE Client error:', error);
    socket.destroy();
  }
}