/**
 * 架构图全局状态管理
 * 修正模型选择的默认值，确保与服务端一致
 */
import { atom } from 'jotai';
import type { AIModelConfig, AIResponse, DiagramData, DirectCallConfig } from '../shared/types';

// 当前架构图数据
export const currentDiagramAtom = atom<DiagramData>({
  title: '',
  description: '',
  mermaidCode: `graph TD
    A[开始] --> B[输入需求]
    B --> C[AI生成代码]
    C --> D[实时预览]
    D --> E[优化调整]
    E --> F[保存分享]`,
  diagramType: 'flowchart',
  tags: []
});

// 自然语言输入
export const naturalLanguageInputAtom = atom<string>('');

// 加载状态
export const isGeneratingAtom = atom<boolean>(false);
export const isOptimizingAtom = atom<boolean>(false);
export const isSavingAtom = atom<boolean>(false);

// AI响应数据
export const aiResponseAtom = atom<AIResponse | null>(null);

// AI模型相关状态 - 修正默认值
export const availableModelsAtom = atom<AIModelConfig[]>([]);
export const selectedModelAtom = atom<string>('ep-20250617131345-rshkp'); // 豆包默认端点，与 Agent 配置一致
export const isLoadingModelsAtom = atom<boolean>(false);

// 直接调用配置（暂时不使用，但保留接口）
export const useDirectCallAtom = atom<boolean>(false);
export const directCallConfigAtom = atom<Record<string, DirectCallConfig>>({});

// 模型选择面板状态
export const modelSelectorOpenAtom = atom<boolean>(false);

// 编辑器配置
export const editorConfigAtom = atom({
  theme: 'vs-dark' as const,
  fontSize: 14,
  wordWrap: 'on' as const,
  minimap: { enabled: false }
});

// 历史记录
export const diagramHistoryAtom = atom<DiagramData[]>([]);

// 预览配置
export const previewConfigAtom = atom({
  theme: 'default' as const,
  scale: 1,
  panZoom: true
});

// 侧边栏状态
export const sidebarOpenAtom = atom<boolean>(false);

// 错误状态
export const errorMessageAtom = atom<string | null>(null);

// 成功消息
export const successMessageAtom = atom<string | null>(null);

// 自定义模型管理
export const customModelsAtom = atom<AIModelConfig[]>([]);

// 添加自定义模型弹窗状态
export const showAddCustomModelAtom = atom<boolean>(false);

// localStorage 相关的自定义模型操作
export const loadCustomModelsAtom = atom(
  null,
  (get, set) => {
    try {
      const stored = localStorage.getItem('flowmind_custom_models');
      if (stored) {
        const customModels: AIModelConfig[] = JSON.parse(stored);
        set(customModelsAtom, customModels);
        
        // 更新到可用模型列表中
        const existingModels = get(availableModelsAtom);
        const allModels = [...existingModels.filter(m => !m.name.startsWith('custom_')), ...customModels];
        set(availableModelsAtom, allModels);
      }
    } catch (error) {
      console.error('加载自定义模型失败:', error);
    }
  }
);

export const saveCustomModelAtom = atom(
  null,
  (get, set, newModel: Omit<AIModelConfig, 'name'>) => {
    const customModels = get(customModelsAtom);
    
    // 生成唯一的模型名称
    const modelName = `custom_${newModel.provider}_${Date.now()}`;
    const modelWithName: AIModelConfig = {
      ...newModel,
      name: modelName,
      enabled: true,
      supportDirectCall: true,
      isUsingDefaultKey: false
    };
    
    const updatedCustomModels = [...customModels, modelWithName];
    
    // 保存到 localStorage
    try {
      localStorage.setItem('flowmind_custom_models', JSON.stringify(updatedCustomModels));
      set(customModelsAtom, updatedCustomModels);
      
      // 更新到可用模型列表
      const existingModels = get(availableModelsAtom);
      const allModels = [...existingModels.filter(m => !m.name.startsWith('custom_')), ...updatedCustomModels];
      set(availableModelsAtom, allModels);
      
      return modelWithName;
    } catch (error) {
      console.error('保存自定义模型失败:', error);
      return null;
    }
  }
);

export const removeCustomModelAtom = atom(
  null,
  (get, set, modelName: string) => {
    const customModels = get(customModelsAtom);
    const updatedCustomModels = customModels.filter(m => m.name !== modelName);
    
    try {
      localStorage.setItem('flowmind_custom_models', JSON.stringify(updatedCustomModels));
      set(customModelsAtom, updatedCustomModels);
      
      // 更新可用模型列表
      const existingModels = get(availableModelsAtom);
      const allModels = existingModels.filter(m => m.name !== modelName);
      set(availableModelsAtom, allModels);
      
      // 如果删除的是当前选中的模型，重置选择
      const selectedModel = get(selectedModelAtom);
      if (selectedModel === modelName) {
        const defaultModel = allModels.find(m => !m.name.startsWith('custom_'));
        if (defaultModel) {
          set(selectedModelAtom, defaultModel.name);
        }
      }
      
      return true;
    } catch (error) {
      console.error('删除自定义模型失败:', error);
      return false;
    }
  }
);