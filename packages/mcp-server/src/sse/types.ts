/**
 * Core TypeScript interfaces for SSE events, connections, and configuration
 */

import { ServerResponse } from 'http';

/**
 * SSE Event interface representing a server-sent event
 */
export interface SSEEvent {
  /** Optional event ID for client-side event tracking */
  id?: string;
  /** Event type/name */
  event: string;
  /** Event data payload */
  data: any;
  /** Optional retry interval in milliseconds */
  retry?: number;
}

/**
 * Enumeration of SSE event types for streaming communication
 */
export enum SSEEventType {
  PROGRESS = 'progress',
  RESULT = 'result',
  ERROR = 'error',
  HEARTBEAT = 'heartbeat',
  VALIDATION_START = 'validation_start',
  VALIDATION_PROGRESS = 'validation_progress',
  VALIDATION_COMPLETE = 'validation_complete',
  OPTIMIZATION_START = 'optimization_start',
  OPTIMIZATION_PROGRESS = 'optimization_progress',
  OPTIMIZATION_COMPLETE = 'optimization_complete',
  TEMPLATE_START = 'template_start',
  TEMPLATE_PROGRESS = 'template_progress',
  TEMPLATE_COMPLETE = 'template_complete',
  FORMAT_CONVERSION_START = 'format_conversion_start',
  FORMAT_CONVERSION_PROGRESS = 'format_conversion_progress',
  FORMAT_CONVERSION_COMPLETE = 'format_conversion_complete'
}

/**
 * SSE Connection interface representing an active client connection
 */
export interface SSEConnection {
  /** Unique connection identifier */
  id: string;
  /** HTTP response object for streaming */
  response: ServerResponse;
  /** Last activity timestamp for connection management */
  lastActivity: Date;
  /** Set of event types this connection is subscribed to */
  subscriptions: Set<string>;
  /** Additional connection metadata */
  metadata: Record<string, any>;
}

/**
 * SSE Server configuration interface
 */
export interface SSEServerConfig {
  /** Server port number */
  port: number;
  /** CORS configuration */
  cors: {
    /** Allowed origins for CORS */
    origin: string[];
    /** Whether to allow credentials */
    credentials: boolean;
  };
  /** Heartbeat configuration */
  heartbeat: {
    /** Whether heartbeat is enabled */
    enabled: boolean;
    /** Heartbeat interval in milliseconds */
    interval: number;
  };
  /** Connection management configuration */
  connection: {
    /** Connection timeout in milliseconds */
    timeout: number;
    /** Maximum number of concurrent connections */
    maxConnections: number;
  };
}

/**
 * Complete SSE configuration interface
 */
export interface SSEConfiguration {
  /** Whether SSE is enabled */
  enabled: boolean;
  /** Server configuration */
  server: SSEServerConfig;
  /** Event configuration */
  events: {
    /** Whether to enable heartbeat events */
    enableHeartbeat: boolean;
    /** Heartbeat interval in milliseconds */
    heartbeatInterval: number;
    /** Whether to enable progress events */
    enableProgress: boolean;
    /** Progress reporting threshold percentage */
    progressThreshold: number;
  };
  /** Security configuration */
  security: {
    /** Allowed origins for connections */
    allowedOrigins: string[];
    /** Whether authentication is required */
    requireAuth: boolean;
    /** Maximum connections per IP address */
    maxConnectionsPerIP: number;
  };
}

/**
 * Heartbeat event data interface
 */
export interface HeartbeatEventData {
  /** Timestamp when heartbeat was sent */
  timestamp: string;
  /** Current number of active connections */
  connectionCount: number;
  /** Server uptime in milliseconds */
  serverUptime: number;
}

/**
 * Connection health status interface
 */
export interface ConnectionHealth {
  /** Connection ID */
  connectionId: string;
  /** Whether connection is healthy */
  isHealthy: boolean;
  /** Time since last activity in milliseconds */
  timeSinceActivity: number;
  /** Last activity timestamp */
  lastActivity: Date;
}

/**
 * Server health status interface
 */
export interface ServerHealth {
  /** Whether server is running */
  isRunning: boolean;
  /** Current connection count */
  connectionCount: number;
  /** Maximum allowed connections */
  maxConnections: number;
  /** Heartbeat statistics */
  heartbeat: {
    enabled: boolean;
    interval: number;
    sent: number;
    lastSent: Date | null;
    errors: number;
  };
  /** Connection statistics */
  connectionStats: {
    activeConnections: number;
    totalConnections: number;
    cleanedUpConnections: number;
    averageConnectionDuration: number;
  };
  /** Server uptime in milliseconds */
  uptime: number;
}