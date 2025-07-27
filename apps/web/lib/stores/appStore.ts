/**
 * Zustand 应用状态管理
 * 从 Jotai 迁移到 Zustand，保持功能一致性
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { AIModelConfig, AIResponse, DiagramData, DirectCallConfig } from '../shared/types';

interface AppState {
  // === 基础状态 ===
  currentDiagram: DiagramData;
  naturalLanguageInput: string;
  selectedModel: string;
  availableModels: AIModelConfig[];

  // === 加载状态 ===
  isGenerating: boolean;
  isOptimizing: boolean;
  isSaving: boolean;
  isLoadingModels: boolean;

  // === UI 状态 ===
  modelSelectorOpen: boolean;
  sidebarOpen: boolean;
  showAddCustomModel: boolean;
  useDirectCall: boolean;
  isInputPanelOpen: boolean;
  isAIAssistantOpen: boolean;

  // === 数据状态 ===
  aiResponse: AIResponse | null;
  customModels: AIModelConfig[];
  directCallConfig: Record<string, DirectCallConfig>;
  diagramHistory: DiagramData[];
  errorMessage: string | null;
  successMessage: string | null;

  // === 编辑器和预览配置 ===
  editorConfig: {
    theme: 'vs-dark' | 'vs-light';
    fontSize: number;
    wordWrap: 'on' | 'off';
    minimap: { enabled: boolean };
  };
  previewConfig: {
    theme: 'default' | 'base' | 'dark' | 'forest' | 'neutral' | 'null';
    look: 'default' | 'handDrawn';
    scale: number;
    panZoom: boolean;
  };
}

interface AppActions {
  // === 基础 Actions ===
  setCurrentDiagram: (diagram: DiagramData) => void;
  setNaturalLanguageInput: (input: string) => void;
  setSelectedModel: (model: string) => void;
  setAvailableModels: (models: AIModelConfig[]) => void;

  // === 加载状态 Actions ===
  setIsGenerating: (loading: boolean) => void;
  setIsOptimizing: (loading: boolean) => void;
  setIsSaving: (loading: boolean) => void;
  setIsLoadingModels: (loading: boolean) => void;

  // === UI 状态 Actions ===
  setModelSelectorOpen: (open: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setShowAddCustomModel: (show: boolean) => void;
  setUseDirectCall: (use: boolean) => void;
  setIsInputPanelOpen: (open: boolean) => void;
  setIsAIAssistantOpen: (open: boolean) => void;

  // === 数据 Actions ===
  setAiResponse: (response: AIResponse | null) => void;
  setDirectCallConfig: (config: Record<string, DirectCallConfig>) => void;
  setDiagramHistory: (history: DiagramData[]) => void;
  setErrorMessage: (message: string | null) => void;
  setSuccessMessage: (message: string | null) => void;

  // === 配置 Actions ===
  setEditorConfig: (config: AppState['editorConfig']) => void;
  setPreviewConfig: (config: AppState['previewConfig']) => void;

  // === 复杂 Actions ===
  loadCustomModels: () => void;
  saveCustomModel: (model: Omit<AIModelConfig, 'name'>) => AIModelConfig | null;
  removeCustomModel: (modelName: string) => void;
  
  // === 工具 Actions ===
  updateDirectCallConfig: (provider: string, config: DirectCallConfig) => void;
  clearMessages: () => void;
}

type AppStore = AppState & AppActions;

// 默认图表数据
const DEFAULT_DIAGRAM: DiagramData = {
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
};

// 获取提供商图标
const getProviderIcon = (provider: string): string => {
  switch (provider) {
    case 'volcengine':
      return '🌋';
    case 'openai':
      return '🤖';
    case 'claude':
      return '🧠';
    case 'azure':
      return '☁️';
    case 'gemini':
      return '💎';
    default:
      return '⚙️';
  }
};

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // === 初始状态 ===
    currentDiagram: DEFAULT_DIAGRAM,
    naturalLanguageInput: '',
    selectedModel: '', // 动态选择模型，不硬编码
    availableModels: [],

    isGenerating: false,
    isOptimizing: false,
    isSaving: false,
    isLoadingModels: false,

    modelSelectorOpen: false,
    sidebarOpen: false,
    showAddCustomModel: false,
    useDirectCall: false,
    isInputPanelOpen: false,
    isAIAssistantOpen: false,

    aiResponse: null,
    customModels: [],
    directCallConfig: {},
    diagramHistory: [],
    errorMessage: null,
    successMessage: null,

    editorConfig: {
      theme: 'vs-dark',
      fontSize: 14,
      wordWrap: 'on',
      minimap: { enabled: false }
    },
    previewConfig: {
      theme: 'default',
      look: 'default',
      scale: 1,
      panZoom: true
    },

    // === 基础 Actions ===
    setCurrentDiagram: (diagram) => set({ currentDiagram: diagram }),
    setNaturalLanguageInput: (input) => set({ naturalLanguageInput: input }),
    setSelectedModel: (model) => set({ selectedModel: model }),
    setAvailableModels: (models) => {
      set({ availableModels: models });
      
      // 如果当前没有选择模型，或者选择的模型不在新的模型列表中，自动选择第一个模型
      const currentSelectedModel = get().selectedModel;
      if (!currentSelectedModel || !models.find(m => m.name === currentSelectedModel)) {
        const firstModel = models[0];
        if (firstModel) {
          set({ selectedModel: firstModel.name });
          console.log(`自动选择模型: ${firstModel.name}`);
        }
      }
    },

    // === 加载状态 Actions ===
    setIsGenerating: (loading) => set({ isGenerating: loading }),
    setIsOptimizing: (loading) => set({ isOptimizing: loading }),
    setIsSaving: (loading) => set({ isSaving: loading }),
    setIsLoadingModels: (loading) => set({ isLoadingModels: loading }),

    // === UI 状态 Actions ===
    setModelSelectorOpen: (open) => set({ modelSelectorOpen: open }),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),
    setShowAddCustomModel: (show) => set({ showAddCustomModel: show }),
    setUseDirectCall: (use) => set({ useDirectCall: use }),
    setIsInputPanelOpen: (open) => set({ isInputPanelOpen: open }),
    setIsAIAssistantOpen: (open) => set({ isAIAssistantOpen: open }),

    // === 数据 Actions ===
    setAiResponse: (response) => set({ aiResponse: response }),
    setDirectCallConfig: (config) => set({ directCallConfig: config }),
    setDiagramHistory: (history) => set({ diagramHistory: history }),
    setErrorMessage: (message) => set({ errorMessage: message }),
    setSuccessMessage: (message) => set({ successMessage: message }),

    // === 配置 Actions ===
    setEditorConfig: (config) => set({ editorConfig: config }),
    setPreviewConfig: (config) => set({ previewConfig: config }),

    // === 复杂 Actions ===
    loadCustomModels: () => {
      try {
        const stored = localStorage.getItem('flowmind_custom_models');
        if (stored) {
          const customModels: AIModelConfig[] = JSON.parse(stored);
          set({ customModels });
          
          // 更新到可用模型列表中
          const existingModels = get().availableModels;
          const allModels = [
            ...existingModels.filter(m => !m.name.startsWith('custom_')), 
            ...customModels
          ];
          set({ availableModels: allModels });
        }
      } catch (error) {
        console.error('加载自定义模型失败:', error);
        set({ errorMessage: '加载自定义模型失败' });
      }
    },

    saveCustomModel: (newModel) => {
      const { customModels, availableModels } = get();
      
      try {
        // 生成唯一的模型名称
        const modelName = `custom_${newModel.provider}_${Date.now()}`;
        const modelWithName: AIModelConfig = {
          ...newModel,
          name: modelName,
          enabled: true,
          supportDirectCall: true,
          isUsingDefaultKey: false,
          icon: newModel.icon || getProviderIcon(newModel.provider)
        };
        
        const updatedCustomModels = [...customModels, modelWithName];
        
        // 保存到 localStorage
        localStorage.setItem('flowmind_custom_models', JSON.stringify(updatedCustomModels));
        
        // 更新状态
        set({ customModels: updatedCustomModels });
        
        // 更新到可用模型列表
        const allModels = [
          ...availableModels.filter(m => !m.name.startsWith('custom_')), 
          ...updatedCustomModels
        ];
        set({ availableModels: allModels });
        
        set({ successMessage: '自定义模型添加成功！' });
        
        return modelWithName;
      } catch (error) {
        console.error('保存自定义模型失败:', error);
        set({ errorMessage: '保存自定义模型失败，请重试' });
        return null;
      }
    },

    removeCustomModel: (modelName) => {
      const { customModels, availableModels, selectedModel } = get();
      
      try {
        const updatedCustomModels = customModels.filter(m => m.name !== modelName);
        
        localStorage.setItem('flowmind_custom_models', JSON.stringify(updatedCustomModels));
        set({ customModels: updatedCustomModels });
        
        // 更新可用模型列表
        const allModels = availableModels.filter(m => m.name !== modelName);
        set({ availableModels: allModels });
        
        // 如果删除的是当前选中的模型，重置选择
        if (selectedModel === modelName) {
          const defaultModel = allModels.find(m => !m.name.startsWith('custom_'));
          if (defaultModel) {
            set({ selectedModel: defaultModel.name });
          }
        }
        
        set({ successMessage: '自定义模型已删除' });
      } catch (error) {
        console.error('删除自定义模型失败:', error);
        set({ errorMessage: '删除自定义模型失败，请重试' });
      }
    },

    // === 工具 Actions ===
    updateDirectCallConfig: (provider, config) => {
      const currentConfig = get().directCallConfig;
      set({
        directCallConfig: {
          ...currentConfig,
          [provider]: config
        }
      });
    },

    clearMessages: () => set({ errorMessage: null, successMessage: null })
  }))
);

export default useAppStore;