/**
 * 模型管理Hook
 * 使用 Zustand 状态管理，负责加载和管理可用的AI模型
 */
import { useMemoizedFn } from 'ahooks';
import { getDefaultModel, getEnabledModels } from '../config/models';
import { useAppStore } from '../stores/appStore';
import { useAvailableModels, useIsLoadingModels, useSelectedModel } from '../stores/hooks';

export const useModelManager = () => {
  const availableModels = useAvailableModels();
  const selectedModel = useSelectedModel();
  const isLoadingModels = useIsLoadingModels();
  
  const setAvailableModels = useAppStore(state => state.setAvailableModels);
  const setSelectedModel = useAppStore(state => state.setSelectedModel);
  const setIsLoadingModels = useAppStore(state => state.setIsLoadingModels);

  const loadModels = useMemoizedFn(async () => {
    if (isLoadingModels) return;
    
    setIsLoadingModels(true);
    
    try {
      console.log('=== 加载可用AI模型 ===');

      const models = getEnabledModels();

      setAvailableModels(models);
      
      // 如果当前没有选择模型或选择的模型不存在，设置默认模型
      if (!selectedModel || !models.find(m => m.model === selectedModel)) {
        const defaultModel = getDefaultModel();
        if (defaultModel) {
          setSelectedModel(defaultModel.model);
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
  });

  return {
    availableModels,
    selectedModel,
    isLoadingModels,
    loadModels,
    setSelectedModel
  };
};