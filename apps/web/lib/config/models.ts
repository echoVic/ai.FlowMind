/**
 * AI模型配置
 * 集中管理所有可用的AI模型配置
 */
import type { AIModelConfig } from '@/types/types';

const AI_MODELS: AIModelConfig[] = [
  {
    name: ' Doubao-Seed-1.6-flash', 
    displayName: '豆包 Seed 1.6 Flash',
    provider: 'volcengine',
    model: 'ep-20250715105951-5rbzv', // Doubao-Seed-1.6-flash
    enabled: true,
    description: '火山引擎豆包Flash模型，快速高效',
    maxTokens: 4096,
    temperature: 0.7,
    supportDirectCall: true,
    implementationType: 'openai-compatible',
    useOpenAIFormat: true,
    icon: '🌋'
  },
  {
    name:'Kimi-K2',
    displayName: 'Kimi-K2',
    provider: 'volcengine',
    model: 'ep-20250731112641-872fj', // Kimi-k2
    enabled: true,
    description: '火山引擎Kimi-k2模型，快速高效',
    maxTokens: 4096,
    temperature: 0.7,
    supportDirectCall: true,
    implementationType: 'openai-compatible',
    useOpenAIFormat: true,
    icon: '🌛'
  },
  // 注释掉的模型 - 保留配置但暂时禁用
  {
    name: 'doubao-seed-1.6',
    displayName: '豆包 Seed 1.6',
    provider: 'volcengine',
    model: 'ep-20250617131345-rshkp', // Doubao-Seed-1.6
    enabled: false, // 暂时禁用
    description: '火山引擎豆包Seed模型，快速高效',
    maxTokens: 2048,
    temperature: 0.7,
    supportDirectCall: true,
    implementationType: 'openai-compatible',
    useOpenAIFormat: true,
    icon: '🌋'
  },
  {
    name: 'doubao-seed-1.6-thinking',
    displayName: '豆包 Seed 1.6 Thinking',
    provider: 'volcengine',
    model: 'ep-20250612135125-br9k7', // Doubao-Seed-1.6-thinking
    enabled: true,
    description: '火山引擎豆包Pro模型，高质量文本生成',
    maxTokens: 4096,
    temperature: 0.7,
    supportDirectCall: true,
    implementationType: 'openai-compatible',
    useOpenAIFormat: true,
    icon: '🌋'
  },
  {
    name: 'doubao-1.5-thinking-pro',
    displayName: '豆包 1.5 Thinking Pro',
    provider: 'volcengine',
    model: 'ep-20250417144747-rgffm', // Doubao-1.5-thinking-pro
    enabled: false, // 暂时禁用
    description: '火山引擎豆包1.5Thinking Pro模型，高质量文本生成',
    maxTokens: 4096,
    temperature: 0.7,
    supportDirectCall: true,
    implementationType: 'openai-compatible',
    useOpenAIFormat: true,
    icon: '🌋'
  },
  {
    name: 'deepseek-v3',
    displayName: 'DeepSeek-V3',
    provider: 'volcengine',
    model: 'ep-20250530171222-q42h8', // DeepSeek-V3
    enabled: false, // 暂时禁用
    description: '火山引擎DeepSeek-V3模型，强大的推理能力',
    maxTokens: 2048,
    temperature: 0.7,
    supportDirectCall: true,
    implementationType: 'openai-compatible',
    useOpenAIFormat: true,
    icon: '🌋'
  },
  {
    name: 'deepseek-r1',
    displayName: 'DeepSeek-R1',
    provider: 'volcengine',
    model: 'ep-20250530171307-rrcc5', // DeepSeek-R1
    enabled: true,
    description: '火山引擎DeepSeek-R1模型，推理增强版',
    maxTokens: 2048,
    temperature: 0.7,
    supportDirectCall: true,
    implementationType: 'openai-compatible',
    useOpenAIFormat: true,
    icon: '🌋'
  },
];

/**
 * 获取默认模型
 */
export const getDefaultModel = (): AIModelConfig | undefined => {
  return AI_MODELS.find(m => m.model === 'ep-20250715105951-5rbzv') || AI_MODELS[0];
};

/**
 * 根据模型ID获取模型配置
 */
const getModelById = (modelId: string): AIModelConfig | undefined => {
  return AI_MODELS.find(m => m.model === modelId);
};

/**
 * 获取启用的模型列表
 */
export const getEnabledModels = (): AIModelConfig[] => {
  return AI_MODELS.filter(m => m.enabled);
};