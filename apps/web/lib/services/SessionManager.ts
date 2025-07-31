/**
 * 会话管理器
 * 为无登录体系的应用提供会话级隔离
 */

export interface SessionConfig {
  sessionId: string;
  createdAt: number;
  lastActivity: number;
  maxAge: number; // 会话最大存活时间（毫秒）
}

class SessionManager {
  private static instance: SessionManager;
  private readonly STORAGE_KEY = 'flow_ai_session';
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24小时

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * 获取当前会话ID，如果不存在则创建新会话
   */
  getCurrentSessionId(): string {
    try {
      if (typeof window === 'undefined') {
        return 'server-session';
      }

      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const config: SessionConfig = JSON.parse(stored);
        const now = Date.now();
        
        // 检查会话是否过期
        if (now - config.lastActivity < config.maxAge) {
          // 更新最后活动时间
          config.lastActivity = now;
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
          return config.sessionId;
        }
      }

      // 创建新会话
      const newSessionId = this.generateSessionId();
      const newConfig: SessionConfig = {
        sessionId: newSessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        maxAge: this.SESSION_TIMEOUT
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newConfig));
      return newSessionId;

    } catch (error) {
      console.warn('SessionManager: 无法访问localStorage，使用临时会话ID');
      return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * 生成新的会话ID
   */
  private generateSessionId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 创建新的会话（手动刷新）
   */
  createNewSession(): string {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return this.getCurrentSessionId();
  }

  /**
   * 获取当前会话配置
   */
  getCurrentSession(): SessionConfig | null {
    try {
      if (typeof window === 'undefined') return null;
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 清理过期会话（可选的维护功能）
   */
  cleanupExpiredSessions(): void {
    // 这个方法主要用于调试和手动清理
    // 在实际应用中，会话会在访问时自动检查过期
  }

  /**
   * 检查会话是否有效
   */
  isSessionValid(sessionId: string): boolean {
    try {
      if (typeof window === 'undefined') return true;
      
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return false;

      const config: SessionConfig = JSON.parse(stored);
      const now = Date.now();
      
      return config.sessionId === sessionId && 
             (now - config.lastActivity) < config.maxAge;
    } catch (error) {
      return false;
    }
  }
}

// 导出单例实例
export const sessionManager = SessionManager.getInstance();