/**
 * 会话管理工具
 * 用于生成和管理用户会话ID，实现无登录的用户隔离
 */

const SESSION_STORAGE_KEY = 'diagram_session_id';
const SESSION_EXPIRY_KEY = 'diagram_session_expiry';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24小时

/**
 * 生成新的会话ID
 */
export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `session_${timestamp}_${random}`;
}

/**
 * 获取当前会话ID，如果不存在或已过期则创建新的
 */
export function getCurrentSessionId(): string {
  if (typeof window === 'undefined') {
    // 服务端环境，返回临时ID
    return generateSessionId();
  }

  try {
    const existingSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
    const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
    
    // 检查会话是否存在且未过期
    if (existingSessionId && expiryTime) {
      const expiry = parseInt(expiryTime, 10);
      if (Date.now() < expiry) {
        return existingSessionId;
      }
    }
    
    // 创建新会话
    const newSessionId = generateSessionId();
    const newExpiry = Date.now() + SESSION_DURATION;
    
    localStorage.setItem(SESSION_STORAGE_KEY, newSessionId);
    localStorage.setItem(SESSION_EXPIRY_KEY, newExpiry.toString());
    
    console.log('Created new session:', newSessionId);
    return newSessionId;
    
  } catch (error) {
    console.warn('Failed to access localStorage, using temporary session:', error);
    return generateSessionId();
  }
}

/**
 * 清除当前会话
 */
export function clearCurrentSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    console.log('Session cleared');
  } catch (error) {
    console.warn('Failed to clear session:', error);
  }
}

/**
 * 延长会话有效期
 */
export function extendSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const newExpiry = Date.now() + SESSION_DURATION;
    localStorage.setItem(SESSION_EXPIRY_KEY, newExpiry.toString());
  } catch (error) {
    console.warn('Failed to extend session:', error);
  }
}

/**
 * 获取会话剩余时间（毫秒）
 */
export function getSessionRemainingTime(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const expiryTime = localStorage.getItem(SESSION_EXPIRY_KEY);
    if (!expiryTime) return 0;
    
    const expiry = parseInt(expiryTime, 10);
    const remaining = expiry - Date.now();
    return Math.max(0, remaining);
  } catch (error) {
    return 0;
  }
}

/**
 * 检查会话是否有效
 */
export function isSessionValid(): boolean {
  return getSessionRemainingTime() > 0;
}