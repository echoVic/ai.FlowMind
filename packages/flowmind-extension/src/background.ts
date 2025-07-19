/**
 * Background Service Worker for FlowMind Chrome Extension
 * 实现 API 请求代理功能，处理各大 LLM API 的跨域请求
 * 监听来自 popup/options 的消息，代理执行 AI 图表生成请求
 * 实现 chrome.storage 数据同步逻辑，处理插件生命周期事件
 */

import { StorageManager, storage, STORAGE_KEYS } from './utils/storage';

// 消息类型定义
interface BackgroundMessage {
  type: string;
  payload?: any;
  requestId?: string;
}

interface GenerateDiagramRequest {
  description: string;
  diagramType?: string;
  existingCode?: string;
  modelConfig: {
    provider: string;
    model: string;
    apiKey: string;
    endpoint?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface OptimizeDiagramRequest {
  mermaidCode: string;
  requirements: string;
  modelConfig: {
    provider: string;
    model: string;
    apiKey: string;
    endpoint?: string;
    temperature?: number;
    maxTokens?: number;
  };
}

interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  usage?: {
    totalTokens?: number;
    promptTokens?: number;
    completionTokens?: number;
  };
}

// 支持的 AI 提供商配置
const AI_PROVIDERS = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  claude: {
    baseURL: 'https://api.anthropic.com/v1',
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
  },
  qwen: {
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  volcengine: {
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    headers: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
};

// 系统提示词
const SYSTEM_PROMPT = `你是一个专业的架构图生成专家。请根据用户的描述生成高质量的Mermaid代码。

生成规则：
1. 严格按照Mermaid语法规范生成代码
2. 根据描述选择最合适的图表类型
3. 节点命名要清晰、有意义
4. 连接关系要符合逻辑
5. 代码结构要清晰易读

支持的图表类型：
- flowchart: 流程图 (推荐用于业务流程、系统架构)
- sequence: 时序图 (推荐用于交互流程、API调用)
- class: 类图 (推荐用于系统设计、数据结构)
- state: 状态图 (推荐用于对象生命周期、协议状态机)
- er: 实体关系图 (推荐用于数据库设计)
- journey: 用户旅程图 (推荐用于用户体验设计)
- gantt: 甘特图 (推荐用于项目计划、时间安排)
- pie: 饼图 (推荐用于数据统计、比例展示)
- quadrant: 四象限图 (推荐用于战略分析、优先级排序)
- mindmap: 思维导图 (推荐用于头脑风暴、知识整理)
- gitgraph: Git分支图 (推荐用于版本管理流程)
- kanban: 看板图 (推荐用于任务管理、敏捷开发)
- architecture: 架构图 (C4风格，推荐用于复杂系统架构展示)
- packet: 数据包图 (推荐用于网络协议分析)

请严格按照以下JSON格式返回：
{
  "mermaidCode": "这里是生成的mermaid代码",
  "explanation": "简要说明代码的功能和结构",
  "suggestions": ["优化建议1", "优化建议2"],
  "diagramType": "图表类型"
}`;

// Service Worker 生命周期事件处理
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('FlowMind Extension installed/updated:', details.reason);
  
  try {
    // 初始化存储
    await StorageManager.initialize();
    
    if (details.reason === 'install') {
      // 首次安装
      console.log('First time installation, setting up defaults...');
      
      // 设置默认配置
      await storage.set(STORAGE_KEYS.LAST_USED_MODEL, 'gpt-3.5-turbo');
      
      // 可以在这里添加欢迎页面或引导流程
      // chrome.tabs.create({ url: chrome.runtime.getURL('src/options/index.html') });
    } else if (details.reason === 'update') {
      // 更新时的处理
      console.log(`Updated from version ${details.previousVersion}`);
      
      // 可以在这里添加更新通知或迁移逻辑
    }
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
});

chrome.runtime.onStartup.addListener(() => {
  console.log('FlowMind Extension started');
});

// 消息处理
chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
  console.log('Background received message:', message.type);
  
  // 异步处理消息
  handleMessage(message, sender)
    .then(response => {
      sendResponse(response);
    })
    .catch(error => {
      console.error('Message handling error:', error);
      sendResponse({
        success: false,
        error: error.message || 'Unknown error occurred',
      });
    });
  
  // 返回 true 表示异步响应
  return true;
});

// 消息处理函数
async function handleMessage(message: BackgroundMessage, sender: chrome.runtime.MessageSender): Promise<APIResponse> {
  const { type, payload } = message;
  
  switch (type) {
    case 'GENERATE_DIAGRAM':
      return await handleGenerateDiagram(payload as GenerateDiagramRequest);
    
    case 'OPTIMIZE_DIAGRAM':
      return await handleOptimizeDiagram(payload as OptimizeDiagramRequest);
    
    case 'TEST_API_CONNECTION':
      return await handleTestAPIConnection(payload);
    
    case 'GET_STORAGE_DATA':
      return await handleGetStorageData(payload);
    
    case 'SET_STORAGE_DATA':
      return await handleSetStorageData(payload);
    
    case 'EXPORT_DATA':
      return await handleExportData();
    
    case 'IMPORT_DATA':
      return await handleImportData(payload);
    
    case 'CLEAR_HISTORY':
      return await handleClearHistory();
    
    case 'GET_STORAGE_STATS':
      return await handleGetStorageStats();
    
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

// 生成图表处理
async function handleGenerateDiagram(request: GenerateDiagramRequest): Promise<APIResponse> {
  const startTime = Date.now();
  
  try {
    console.log('Generating diagram with request:', {
      description: request.description.substring(0, 100) + '...',
      diagramType: request.diagramType,
      provider: request.modelConfig.provider,
      model: request.modelConfig.model,
    });
    
    // 构建用户提示
    let userPrompt = '';
    if (request.existingCode) {
      userPrompt = `请基于现有代码进行优化和扩展：

现有代码：
\`\`\`mermaid
${request.existingCode}
\`\`\`

新需求：${request.description}
建议图表类型：${request.diagramType || '自动选择最合适的类型'}

请保持原有结构的基础上，根据新需求进行优化。`;
    } else {
      userPrompt = `请根据以下描述生成架构图：

需求描述：${request.description}
建议图表类型：${request.diagramType || '请自动选择最合适的图表类型'}

请生成清晰、专业的架构图代码。`;
    }
    
    // 调用 AI API
    const response = await callAIAPI(request.modelConfig, userPrompt);
    
    // 记录性能数据
    const responseTime = Date.now() - startTime;
    await StorageManager.updateModelCache(
      `${request.modelConfig.provider}:${request.modelConfig.model}`,
      responseTime,
      response.success
    );
    
    if (response.success && response.data) {
      // 解析响应
      const parsedResult = parseAIResponse(response.data.content);
      
      // 保存到历史记录
      await StorageManager.addGenerationHistory({
        prompt: request.description,
        result: {
          title: `Generated at ${new Date().toLocaleString()}`,
          description: request.description,
          mermaidCode: parsedResult.mermaidCode,
          diagramType: parsedResult.diagramType as any,
          tags: [],
        },
        modelUsed: `${request.modelConfig.provider}:${request.modelConfig.model}`,
        success: true,
      });
      
      return {
        success: true,
        data: parsedResult,
        usage: response.usage,
      };
    }
    
    return response;
  } catch (error) {
    console.error('Generate diagram error:', error);
    
    // 记录失败
    const responseTime = Date.now() - startTime;
    await StorageManager.updateModelCache(
      `${request.modelConfig.provider}:${request.modelConfig.model}`,
      responseTime,
      false
    );
    
    await StorageManager.addGenerationHistory({
      prompt: request.description,
      result: {
        title: 'Generation Failed',
        description: request.description,
        mermaidCode: '',
        diagramType: 'flowchart',
        tags: [],
      },
      modelUsed: `${request.modelConfig.provider}:${request.modelConfig.model}`,
      success: false,
      error: error.message,
    });
    
    return {
      success: false,
      error: error.message || 'Failed to generate diagram',
    };
  }
}

// 优化图表处理
async function handleOptimizeDiagram(request: OptimizeDiagramRequest): Promise<APIResponse> {
  const generateRequest: GenerateDiagramRequest = {
    description: request.requirements,
    existingCode: request.mermaidCode,
    modelConfig: request.modelConfig,
  };
  
  return await handleGenerateDiagram(generateRequest);
}

// 测试 API 连接
async function handleTestAPIConnection(config: any): Promise<APIResponse> {
  try {
    const testPrompt = '请生成一个简单的流程图，包含开始、处理、结束三个节点。';
    const response = await callAIAPI(config, testPrompt);
    
    return {
      success: response.success,
      data: response.success ? 'API connection successful' : null,
      error: response.error,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'API connection failed',
    };
  }
}

// 调用 AI API
async function callAIAPI(modelConfig: any, userPrompt: string): Promise<APIResponse> {
  const provider = AI_PROVIDERS[modelConfig.provider as keyof typeof AI_PROVIDERS];
  if (!provider) {
    throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
  
  const endpoint = modelConfig.endpoint || provider.baseURL;
  const headers = provider.headers(modelConfig.apiKey);
  
  let requestBody: any;
  let url: string;
  
  // 根据不同提供商构建请求
  if (modelConfig.provider === 'claude') {
    url = `${endpoint}/messages`;
    requestBody = {
      model: modelConfig.model,
      max_tokens: modelConfig.maxTokens || 2048,
      temperature: modelConfig.temperature || 0.7,
      messages: [
        {
          role: 'user',
          content: `${SYSTEM_PROMPT}\n\n${userPrompt}`,
        },
      ],
    };
  } else {
    // OpenAI 兼容格式 (OpenAI, Qwen, Volcengine)
    url = `${endpoint}/chat/completions`;
    requestBody = {
      model: modelConfig.model,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: modelConfig.temperature || 0.7,
      max_tokens: modelConfig.maxTokens || 2048,
    };
  }
  
  try {
    console.log('Calling AI API:', {
      provider: modelConfig.provider,
      model: modelConfig.model,
      url,
    });
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('AI API response received');
    
    // 提取内容和使用信息
    let content: string;
    let usage: any;
    
    if (modelConfig.provider === 'claude') {
      content = data.content[0]?.text || '';
      usage = data.usage;
    } else {
      content = data.choices[0]?.message?.content || '';
      usage = data.usage;
    }
    
    return {
      success: true,
      data: {
        content,
        model: modelConfig.model,
        provider: modelConfig.provider,
      },
      usage: usage ? {
        totalTokens: usage.total_tokens,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      } : undefined,
    };
  } catch (error) {
    console.error('AI API call failed:', error);
    return {
      success: false,
      error: error.message || 'API call failed',
    };
  }
}

// 解析 AI 响应
function parseAIResponse(content: string): any {
  try {
    console.log('Parsing AI response:', content.substring(0, 200) + '...');
    
    // 首先尝试解析JSON响应
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // 验证必要字段
        if (parsed.mermaidCode && parsed.explanation && parsed.diagramType) {
          // 清理 mermaidCode
          let cleanedCode = parsed.mermaidCode
            .replace(/^```mermaid\s*\n?/i, '')
            .replace(/^```\s*\n?/i, '')
            .replace(/\n?```\s*$/i, '')
            .trim();
          
          return {
            mermaidCode: cleanedCode,
            explanation: parsed.explanation,
            suggestions: parsed.suggestions || [],
            diagramType: parsed.diagramType,
          };
        }
      } catch (jsonError) {
        console.log('JSON parsing failed, trying to fix...');
        
        // 尝试修复JSON
        const fixedJson = fixJsonString(jsonMatch[0]);
        const parsed = JSON.parse(fixedJson);
        
        if (parsed.mermaidCode && parsed.explanation && parsed.diagramType) {
          let cleanedCode = parsed.mermaidCode
            .replace(/^```mermaid\s*\n?/i, '')
            .replace(/^```\s*\n?/i, '')
            .replace(/\n?```\s*$/i, '')
            .trim();
          
          return {
            mermaidCode: cleanedCode,
            explanation: parsed.explanation,
            suggestions: parsed.suggestions || [],
            diagramType: parsed.diagramType,
          };
        }
      }
    }
    
    // 如果JSON解析失败，尝试解析为纯Mermaid代码
    const mermaidMatch = content.match(/```mermaid\n([\s\S]*?)\n```/);
    if (mermaidMatch) {
      const mermaidCode = mermaidMatch[1];
      const detectedType = detectDiagramType(mermaidCode);
      
      return {
        mermaidCode: mermaidCode,
        explanation: '已生成Mermaid图表代码',
        suggestions: ['可以进一步优化图表结构', '添加更多详细信息'],
        diagramType: detectedType,
      };
    }
    
    // 检查是否是纯Mermaid代码
    if (content.includes('graph') || content.includes('flowchart') || content.includes('sequenceDiagram')) {
      const detectedType = detectDiagramType(content);
      
      return {
        mermaidCode: content.trim(),
        explanation: '已生成Mermaid图表代码',
        suggestions: ['可以进一步优化图表结构', '添加更多详细信息'],
        diagramType: detectedType,
      };
    }
    
    throw new Error('无法识别响应格式');
  } catch (error) {
    console.error('Response parsing failed:', error);
    
    // 返回默认响应
    return {
      mermaidCode: 'graph TD\n    A[解析失败] --> B[请检查输入]',
      explanation: '响应解析失败，请重试',
      suggestions: ['检查网络连接', '重新描述需求'],
      diagramType: 'flowchart',
    };
  }
}

// 修复JSON字符串
function fixJsonString(jsonString: string): string {
  return jsonString
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// 检测图表类型
function detectDiagramType(code: string): string {
  const trimmedCode = code.trim();
  
  if (trimmedCode.includes('sequenceDiagram')) return 'sequence';
  if (trimmedCode.includes('classDiagram')) return 'class';
  if (trimmedCode.includes('erDiagram')) return 'er';
  if (trimmedCode.includes('gitgraph')) return 'gitgraph';
  if (trimmedCode.includes('gantt')) return 'gantt';
  if (trimmedCode.includes('pie')) return 'pie';
  if (trimmedCode.includes('journey')) return 'journey';
  if (trimmedCode.includes('graph') || trimmedCode.includes('flowchart')) return 'flowchart';
  
  return 'flowchart';
}

// 存储数据处理
async function handleGetStorageData(key: string): Promise<APIResponse> {
  try {
    const data = await storage.get(key as any);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleSetStorageData(payload: { key: string; value: any }): Promise<APIResponse> {
  try {
    await storage.set(payload.key as any, payload.value);
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleExportData(): Promise<APIResponse> {
  try {
    const data = await StorageManager.exportData();
    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleImportData(jsonData: string): Promise<APIResponse> {
  try {
    const success = await StorageManager.importData(jsonData);
    return {
      success,
      error: success ? undefined : 'Import failed',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleClearHistory(): Promise<APIResponse> {
  try {
    await storage.set(STORAGE_KEYS.DIAGRAM_HISTORY, []);
    await storage.set(STORAGE_KEYS.GENERATION_HISTORY, []);
    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function handleGetStorageStats(): Promise<APIResponse> {
  try {
    const stats = await StorageManager.getStorageStats();
    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// 存储变化监听
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    console.log('Storage changed:', Object.keys(changes));
    
    // 可以在这里添加存储变化的处理逻辑
    // 例如：同步到其他标签页、触发通知等
  }
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('Background script error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('FlowMind Background Service Worker loaded');