/**
 * 模型管理Hook
 * 使用 Zustand 状态管理，负责加载和管理可用的AI模型
 */
import { useCallback } from 'react';
import type { AIModelConfig } from '../shared/types';
import { useAppStore } from '../stores/appStore';
import { useAvailableModels, useIsLoadingModels, useSelectedModel } from '../stores/hooks';

export const useModelManager = () => {
  const availableModels = useAvailableModels();
  const selectedModel = useSelectedModel();
  const isLoadingModels = useIsLoadingModels();
  
  const setAvailableModels = useAppStore(state => state.setAvailableModels);
  const setSelectedModel = useAppStore(state => state.setSelectedModel);
  const setIsLoadingModels = useAppStore(state => state.setIsLoadingModels);

  const loadModels = useCallback(async () => {
    if (isLoadingModels) return;
    
    setIsLoadingModels(true);
    
    try {
      console.log('=== 加载可用AI模型 ===');
      
      // 火山引擎模型列表（与 defaultModelOptions 保持一致）
      const models: AIModelConfig[] = [
        {
          name: 'deepseek-v3',
          displayName: 'DeepSeek-V3',
          provider: 'volcengine',
          model: 'ep-20250530171222-q42h8', // DeepSeek-V3
          enabled: true,
          description: '火山引擎DeepSeek-V3模型，强大的推理能力',
          maxTokens: 2048,
          temperature: 0.7,
          supportDirectCall: true,
          implementationType: 'openai-compatible',
          useOpenAIFormat: true,
          icon: '🌋'
        },
        {
          name: 'doubao-seed-1.6-flash',
          displayName: 'Doubao-Seed-1.6-flash | 250615',
          provider: 'volcengine',
          model: 'ep-20250715105951-5rbzv', // Doubao-Seed-1.6-flash
          enabled: true,
          description: '火山引擎豆包Seed Flash模型，超快响应',
          maxTokens: 2048,
          temperature: 0.7,
          supportDirectCall: true,
          implementationType: 'openai-compatible',
          useOpenAIFormat: true,
          icon: '🌋'
        },
        {
          name: 'doubao-seed-1.6',
          displayName: 'Doubao-Seed-1.6 | 250615',
          provider: 'volcengine',
          model: 'ep-20250617131345-rshkp', // Doubao-Seed-1.6
          enabled: true,
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
          displayName: 'Doubao-Seed-1.6-thinking | 250615',
          provider: 'volcengine',
          model: 'ep-20250612135125-br9k7', // Doubao-Seed-1.6-thinking
          enabled: true,
          description: '火山引擎豆包Seed Thinking模型，深度思考',
          maxTokens: 4096,
          temperature: 0.7,
          supportDirectCall: true,
          implementationType: 'openai-compatible',
          useOpenAIFormat: true,
          icon: '🌋'
        },
        {
          name: 'doubao-1.5-thinking-pro',
          displayName: 'Doubao-1.5-thinking-pro',
          provider: 'volcengine',
          model: 'ep-20250417144747-rgffm', // Doubao-1.5-thinking-pro
          enabled: true,
          description: '火山引擎豆包1.5Thinking Pro模型，高质量文本生成',
          maxTokens: 4096,
          temperature: 0.7,
          supportDirectCall: true,
          implementationType: 'openai-compatible',
          useOpenAIFormat: true,
          icon: '🌋'
        },
        {
          name: 'deepseek-r1',
          displayName: 'DeepSeek-R1 | 250528',
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
        }
      ];

      setAvailableModels(models);
      
      // 如果当前没有选择模型或选择的模型不存在，设置默认模型
      if (!selectedModel || !models.find(m => m.name === selectedModel)) {
        const defaultModel = models.find(m => m.name === 'deepseek-v3') || models[0];
        if (defaultModel) {
          setSelectedModel(defaultModel.name);
          console.log('设置默认模型:', defaultModel.displayName);
        }
      }

      console.log(`模型加载完成，共 ${models.length} 个模型`);
      
    } catch (error) {
      console.error('加载模型失败:', error);
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, [isLoadingModels, selectedModel, setAvailableModels, setSelectedModel, setIsLoadingModels]);

  return {
    availableModels,
    selectedModel,
    isLoadingModels,
    loadModels,
    setSelectedModel
  };
};