/**
 * Chrome Extension Storage Utility
 * 提供类型安全的 Chrome 存储接口，支持配置数据、历史记录、用户偏好等的存储和读取
 */

// 存储键常量
export const STORAGE_KEYS = {
  // 配置相关
  AI_MODELS: 'ai_models',
  USER_PREFERENCES: 'user_preferences',
  API_KEYS: 'api_keys',
  
  // 历史记录
  DIAGRAM_HISTORY: 'diagram_history',
  GENERATION_HISTORY: 'generation_history',
  
  // 应用状态
  LAST_USED_MODEL: 'last_used_model',
  THEME: 'theme',
  
  // 缓存
  MODEL_CACHE: 'model_cache',
  
  // 版本控制
  STORAGE_VERSION: 'storage_version',
} as const;

// 当前存储版本
const CURRENT_STORAGE_VERSION = '1.0.0';

// 类型定义
export interface DiagramData {
  id?: string;
  title: string;
  description: string;
  mermaidCode: string;
  diagramType: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'journey' | 'gantt' | 'pie' | 'quadrant' | 'mindmap' | 'gitgraph' | 'kanban' | 'architecture' | 'packet';
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AIModelConfig {
  name: string;
  displayName: string;
  provider: 'openai' | 'claude' | 'volcengine' | 'qwen' | string;
  apiKey?: string;
  endpoint?: string;
  openaiCompatibleEndpoint?: string;
  model: string;
  enabled: boolean;
  description?: string;
  maxTokens?: number;
  temperature?: number;
  supportDirectCall?: boolean;
  implementationType?: 'native-fetch' | 'openai-native' | 'openai-compatible' | 'anthropic-native' | 'qwen-native' | 'custom';
  useOpenAIFormat?: boolean;
  isUsingDefaultKey?: boolean;
  icon?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultDiagramType: DiagramData['diagramType'];
  autoSave: boolean;
  showTips: boolean;
  language: 'zh' | 'en';
  maxHistoryItems: number;
  enableAnalytics: boolean;
}

export interface GenerationHistoryItem {
  id: string;
  prompt: string;
  result: DiagramData;
  modelUsed: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface APIKeyConfig {
  provider: string;
  apiKey: string;
  endpoint?: string;
  encrypted: boolean;
  lastUsed?: string;
}

export interface ModelCache {
  [modelName: string]: {
    lastUsed: string;
    performance: {
      averageResponseTime: number;
      successRate: number;
      totalRequests: number;
    };
  };
}

// 存储数据类型映射
export interface StorageData {
  [STORAGE_KEYS.AI_MODELS]: AIModelConfig[];
  [STORAGE_KEYS.USER_PREFERENCES]: UserPreferences;
  [STORAGE_KEYS.API_KEYS]: APIKeyConfig[];
  [STORAGE_KEYS.DIAGRAM_HISTORY]: DiagramData[];
  [STORAGE_KEYS.GENERATION_HISTORY]: GenerationHistoryItem[];
  [STORAGE_KEYS.LAST_USED_MODEL]: string;
  [STORAGE_KEYS.THEME]: UserPreferences['theme'];
  [STORAGE_KEYS.MODEL_CACHE]: ModelCache;
  [STORAGE_KEYS.STORAGE_VERSION]: string;
}

// 默认配置
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  defaultDiagramType: 'flowchart',
  autoSave: true,
  showTips: true,
  language: 'zh',
  maxHistoryItems: 100,
  enableAnalytics: false,
};

// 简单的加密/解密函数（用于敏感数据）
class SimpleEncryption {
  private static key = 'flowmind-extension-key';

  static encrypt(text: string): string {
    // 简单的 XOR 加密，实际项目中应使用更安全的加密方法
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
      );
    }
    return btoa(result);
  }

  static decrypt(encryptedText: string): string {
    try {
      const text = atob(encryptedText);
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
          text.charCodeAt(i) ^ this.key.charCodeAt(i % this.key.length)
        );
      }
      return result;
    } catch {
      return '';
    }
  }
}

// 存储工具类
export class ChromeStorage {
  /**
   * 获取存储数据
   */
  static async get<K extends keyof StorageData>(
    key: K
  ): Promise<StorageData[K] | null> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`Failed to get storage data for key: ${key}`, error);
      return null;
    }
  }

  /**
   * 设置存储数据
   */
  static async set<K extends keyof StorageData>(
    key: K,
    value: StorageData[K]
  ): Promise<boolean> {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      console.error(`Failed to set storage data for key: ${key}`, error);
      return false;
    }
  }

  /**
   * 删除存储数据
   */
  static async remove(key: keyof StorageData): Promise<boolean> {
    try {
      await chrome.storage.local.remove(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove storage data for key: ${key}`, error);
      return false;
    }
  }

  /**
   * 清空所有存储数据
   */
  static async clear(): Promise<boolean> {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear storage data', error);
      return false;
    }
  }

  /**
   * 获取存储使用情况
   */
  static async getUsage(): Promise<{ bytesInUse: number; quota: number }> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      return {
        bytesInUse,
        quota: chrome.storage.local.QUOTA_BYTES,
      };
    } catch (error) {
      console.error('Failed to get storage usage', error);
      return { bytesInUse: 0, quota: 0 };
    }
  }

  /**
   * 监听存储变化
   */
  static onChanged(
    callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void
  ): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        callback(changes);
      }
    });
  }
}

// 同步存储工具类（用于用户偏好等需要跨设备同步的数据）
export class ChromeSyncStorage {
  /**
   * 获取同步存储数据
   */
  static async get<K extends keyof Pick<StorageData, 'user_preferences' | 'theme'>>(
    key: K
  ): Promise<StorageData[K] | null> {
    try {
      const result = await chrome.storage.sync.get(key);
      return result[key] || null;
    } catch (error) {
      console.error(`Failed to get sync storage data for key: ${key}`, error);
      return null;
    }
  }

  /**
   * 设置同步存储数据
   */
  static async set<K extends keyof Pick<StorageData, 'user_preferences' | 'theme'>>(
    key: K,
    value: StorageData[K]
  ): Promise<boolean> {
    try {
      await chrome.storage.sync.set({ [key]: value });
      return true;
    } catch (error) {
      console.error(`Failed to set sync storage data for key: ${key}`, error);
      return false;
    }
  }
}

// 高级存储操作类
export class StorageManager {
  /**
   * 初始化存储
   */
  static async initialize(): Promise<void> {
    try {
      // 检查存储版本
      const version = await ChromeStorage.get(STORAGE_KEYS.STORAGE_VERSION);
      if (!version || version !== CURRENT_STORAGE_VERSION) {
        await this.migrate(version);
      }

      // 初始化默认用户偏好
      const preferences = await ChromeStorage.get(STORAGE_KEYS.USER_PREFERENCES);
      if (!preferences) {
        await ChromeStorage.set(STORAGE_KEYS.USER_PREFERENCES, DEFAULT_USER_PREFERENCES);
      }

      // 初始化空的模型配置
      const models = await ChromeStorage.get(STORAGE_KEYS.AI_MODELS);
      if (!models) {
        await ChromeStorage.set(STORAGE_KEYS.AI_MODELS, []);
      }

      // 初始化空的历史记录
      const history = await ChromeStorage.get(STORAGE_KEYS.DIAGRAM_HISTORY);
      if (!history) {
        await ChromeStorage.set(STORAGE_KEYS.DIAGRAM_HISTORY, []);
      }

      const generationHistory = await ChromeStorage.get(STORAGE_KEYS.GENERATION_HISTORY);
      if (!generationHistory) {
        await ChromeStorage.set(STORAGE_KEYS.GENERATION_HISTORY, []);
      }

      // 设置当前版本
      await ChromeStorage.set(STORAGE_KEYS.STORAGE_VERSION, CURRENT_STORAGE_VERSION);
    } catch (error) {
      console.error('Failed to initialize storage', error);
    }
  }

  /**
   * 数据迁移
   */
  static async migrate(oldVersion: string | null): Promise<void> {
    console.log(`Migrating storage from version ${oldVersion} to ${CURRENT_STORAGE_VERSION}`);
    
    // 这里可以添加版本迁移逻辑
    // 例如：重命名键、转换数据格式等
    
    if (!oldVersion) {
      // 首次安装，无需迁移
      return;
    }

    // 示例迁移逻辑
    if (oldVersion === '0.9.0') {
      // 从 0.9.0 迁移到 1.0.0
      // 可以添加具体的迁移逻辑
    }
  }

  /**
   * 安全存储 API 密钥
   */
  static async storeAPIKey(provider: string, apiKey: string, endpoint?: string): Promise<boolean> {
    try {
      const apiKeys = await ChromeStorage.get(STORAGE_KEYS.API_KEYS) || [];
      
      // 移除同一提供商的旧密钥
      const filteredKeys = apiKeys.filter(key => key.provider !== provider);
      
      // 添加新密钥（加密存储）
      const newKey: APIKeyConfig = {
        provider,
        apiKey: SimpleEncryption.encrypt(apiKey),
        endpoint,
        encrypted: true,
        lastUsed: new Date().toISOString(),
      };
      
      filteredKeys.push(newKey);
      return await ChromeStorage.set(STORAGE_KEYS.API_KEYS, filteredKeys);
    } catch (error) {
      console.error('Failed to store API key', error);
      return false;
    }
  }

  /**
   * 获取 API 密钥
   */
  static async getAPIKey(provider: string): Promise<string | null> {
    try {
      const apiKeys = await ChromeStorage.get(STORAGE_KEYS.API_KEYS) || [];
      const keyConfig = apiKeys.find(key => key.provider === provider);
      
      if (!keyConfig) {
        return null;
      }
      
      return keyConfig.encrypted 
        ? SimpleEncryption.decrypt(keyConfig.apiKey)
        : keyConfig.apiKey;
    } catch (error) {
      console.error('Failed to get API key', error);
      return null;
    }
  }

  /**
   * 删除 API 密钥
   */
  static async removeAPIKey(provider: string): Promise<boolean> {
    try {
      const apiKeys = await ChromeStorage.get(STORAGE_KEYS.API_KEYS) || [];
      const filteredKeys = apiKeys.filter(key => key.provider !== provider);
      return await ChromeStorage.set(STORAGE_KEYS.API_KEYS, filteredKeys);
    } catch (error) {
      console.error('Failed to remove API key', error);
      return false;
    }
  }

  /**
   * 添加图表到历史记录
   */
  static async addDiagramToHistory(diagram: DiagramData): Promise<boolean> {
    try {
      const history = await ChromeStorage.get(STORAGE_KEYS.DIAGRAM_HISTORY) || [];
      const preferences = await ChromeStorage.get(STORAGE_KEYS.USER_PREFERENCES) || DEFAULT_USER_PREFERENCES;
      
      // 添加时间戳
      const diagramWithTimestamp = {
        ...diagram,
        id: diagram.id || `diagram_${Date.now()}`,
        createdAt: diagram.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // 添加到历史记录开头
      history.unshift(diagramWithTimestamp);
      
      // 限制历史记录数量
      if (history.length > preferences.maxHistoryItems) {
        history.splice(preferences.maxHistoryItems);
      }
      
      return await ChromeStorage.set(STORAGE_KEYS.DIAGRAM_HISTORY, history);
    } catch (error) {
      console.error('Failed to add diagram to history', error);
      return false;
    }
  }

  /**
   * 添加生成历史记录
   */
  static async addGenerationHistory(item: Omit<GenerationHistoryItem, 'id' | 'timestamp'>): Promise<boolean> {
    try {
      const history = await ChromeStorage.get(STORAGE_KEYS.GENERATION_HISTORY) || [];
      
      const historyItem: GenerationHistoryItem = {
        ...item,
        id: `gen_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      
      history.unshift(historyItem);
      
      // 限制历史记录数量
      if (history.length > 50) {
        history.splice(50);
      }
      
      return await ChromeStorage.set(STORAGE_KEYS.GENERATION_HISTORY, history);
    } catch (error) {
      console.error('Failed to add generation history', error);
      return false;
    }
  }

  /**
   * 清理历史记录
   */
  static async cleanupHistory(): Promise<boolean> {
    try {
      const preferences = await ChromeStorage.get(STORAGE_KEYS.USER_PREFERENCES) || DEFAULT_USER_PREFERENCES;
      const history = await ChromeStorage.get(STORAGE_KEYS.DIAGRAM_HISTORY) || [];
      
      // 只保留最新的记录
      const cleanedHistory = history.slice(0, preferences.maxHistoryItems);
      
      return await ChromeStorage.set(STORAGE_KEYS.DIAGRAM_HISTORY, cleanedHistory);
    } catch (error) {
      console.error('Failed to cleanup history', error);
      return false;
    }
  }

  /**
   * 更新模型缓存
   */
  static async updateModelCache(modelName: string, responseTime: number, success: boolean): Promise<void> {
    try {
      const cache = await ChromeStorage.get(STORAGE_KEYS.MODEL_CACHE) || {};
      
      if (!cache[modelName]) {
        cache[modelName] = {
          lastUsed: new Date().toISOString(),
          performance: {
            averageResponseTime: responseTime,
            successRate: success ? 1 : 0,
            totalRequests: 1,
          },
        };
      } else {
        const perf = cache[modelName].performance;
        perf.totalRequests += 1;
        perf.averageResponseTime = (perf.averageResponseTime * (perf.totalRequests - 1) + responseTime) / perf.totalRequests;
        perf.successRate = (perf.successRate * (perf.totalRequests - 1) + (success ? 1 : 0)) / perf.totalRequests;
        cache[modelName].lastUsed = new Date().toISOString();
      }
      
      await ChromeStorage.set(STORAGE_KEYS.MODEL_CACHE, cache);
    } catch (error) {
      console.error('Failed to update model cache', error);
    }
  }

  /**
   * 导出所有数据
   */
  static async exportData(): Promise<string> {
    try {
      const data: Partial<StorageData> = {};
      
      for (const key of Object.values(STORAGE_KEYS)) {
        const value = await ChromeStorage.get(key as keyof StorageData);
        if (value !== null) {
          data[key as keyof StorageData] = value as any;
        }
      }
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data', error);
      return '{}';
    }
  }

  /**
   * 导入数据
   */
  static async importData(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      for (const [key, value] of Object.entries(data)) {
        if (Object.values(STORAGE_KEYS).includes(key as any)) {
          await ChromeStorage.set(key as keyof StorageData, value as any);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data', error);
      return false;
    }
  }

  /**
   * 获取存储统计信息
   */
  static async getStorageStats(): Promise<{
    totalItems: number;
    diagramCount: number;
    generationCount: number;
    modelCount: number;
    bytesUsed: number;
    quota: number;
  }> {
    try {
      const [diagrams, generations, models, usage] = await Promise.all([
        ChromeStorage.get(STORAGE_KEYS.DIAGRAM_HISTORY),
        ChromeStorage.get(STORAGE_KEYS.GENERATION_HISTORY),
        ChromeStorage.get(STORAGE_KEYS.AI_MODELS),
        ChromeStorage.getUsage(),
      ]);

      return {
        totalItems: Object.keys(await chrome.storage.local.get()).length,
        diagramCount: diagrams?.length || 0,
        generationCount: generations?.length || 0,
        modelCount: models?.length || 0,
        bytesUsed: usage.bytesInUse,
        quota: usage.quota,
      };
    } catch (error) {
      console.error('Failed to get storage stats', error);
      return {
        totalItems: 0,
        diagramCount: 0,
        generationCount: 0,
        modelCount: 0,
        bytesUsed: 0,
        quota: 0,
      };
    }
  }
}

// 导出便捷函数
export const storage = {
  // 基础操作
  get: ChromeStorage.get,
  set: ChromeStorage.set,
  remove: ChromeStorage.remove,
  clear: ChromeStorage.clear,
  
  // 同步存储
  sync: {
    get: ChromeSyncStorage.get,
    set: ChromeSyncStorage.set,
  },
  
  // 高级操作
  manager: StorageManager,
  
  // 常量
  keys: STORAGE_KEYS,
};

export default storage;