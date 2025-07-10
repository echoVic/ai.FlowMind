/**
 * 模型管理Hook
 * 使用 Zustand 状态管理，负责加载和管理可用的AI模型
 */
import { useCallback } from 'react';
import { useAvailableModels, useSelectedModel, useIsLoadingModels } from '../stores/hooks';
import { useAppStore } from '../stores/appStore';
import type { AIModelConfig } from '../shared/types';

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
      
      // 模拟模型列表（实际应用中可能从服务端获取）
      const models: AIModelConfig[] = [
        {
          name: 'doubao-pro',
          displayName: '豆包 Pro',
          provider: 'volcengine',
          model: 'ep-20250617131345-rshkp',
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
          name: 'doubao-seed-1.6',
          displayName: '豆包 Seed 1.6',
          provider: 'volcengine',
          model: 'ep-20250617131345-rshkp',
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
          name: 'gpt-4',
          displayName: 'GPT-4',
          provider: 'openai',
          model: 'gpt-4',
          enabled: true,
          description: 'OpenAI GPT-4模型，最强文本理解能力',
          maxTokens: 2048,
          temperature: 0.7,
          supportDirectCall: true,
          implementationType: 'openai-native',
          useOpenAIFormat: true,
          icon: '🤖'
        },
        {
          name: 'gpt-3.5-turbo',
          displayName: 'GPT-3.5 Turbo',
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          enabled: true,
          description: 'OpenAI GPT-3.5模型，快速响应',
          maxTokens: 2048,
          temperature: 0.7,
          supportDirectCall: true,
          implementationType: 'openai-native',
          useOpenAIFormat: true,
          icon: '🤖'
        },
        {
          name: 'claude-3-5-sonnet',
          displayName: 'Claude 3.5 Sonnet',
          provider: 'claude',
          model: 'claude-3-5-sonnet-20241022',
          enabled: true,
          description: 'Anthropic Claude 3.5模型，逻辑推理强',
          maxTokens: 2048,
          temperature: 0.7,
          supportDirectCall: true,
          implementationType: 'anthropic-native',
          useOpenAIFormat: false,
          icon: '🧠'
        }
      ];

      setAvailableModels(models);
      
      // 如果当前没有选择模型或选择的模型不存在，设置默认模型
      if (!selectedModel || !models.find(m => m.name === selectedModel)) {
        const defaultModel = models.find(m => m.name === 'doubao-pro') || models[0];
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