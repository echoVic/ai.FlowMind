/**
 * Zustand 选择器和 Action Hooks
 * 提供细粒度的状态选择和操作，优化性能
 */
import type { AIModelConfig, DiagramData } from '@/types/types';
import { useAppStore } from './appStore';

// === 基础状态选择器 ===
export const useCurrentDiagram = () => useAppStore(state => state.currentDiagram);
export const useNaturalLanguageInput = () => useAppStore(state => state.naturalLanguageInput);
export const useSelectedModel = () => useAppStore(state => state.selectedModel);
export const useAvailableModels = () => useAppStore(state => state.availableModels);

// === 加载状态选择器 ===
export const useIsGenerating = () => useAppStore(state => state.isGenerating);
export const useIsOptimizing = () => useAppStore(state => state.isOptimizing);
export const useIsSaving = () => useAppStore(state => state.isSaving);
export const useIsLoadingModels = () => useAppStore(state => state.isLoadingModels);

// === UI 状态选择器 ===
const useModelSelectorOpen = () => useAppStore(state => state.modelSelectorOpen);
export const useSidebarOpen = () => useAppStore(state => state.sidebarOpen);
const useShowAddCustomModel = () => useAppStore(state => state.showAddCustomModel);
const useUseDirectCall = () => useAppStore(state => state.useDirectCall);
const useIsInputPanelOpen = () => useAppStore(state => state.isInputPanelOpen);
const useIsAIAssistantOpen = () => useAppStore(state => state.isAIAssistantOpen);

// === 数据状态选择器 ===
export const useAiResponse = () => useAppStore(state => state.aiResponse);
const useCustomModels = () => useAppStore(state => state.customModels);
export const useDirectCallConfig = () => useAppStore(state => state.directCallConfig);
export const useDiagramHistory = () => useAppStore(state => state.diagramHistory);
const useErrorMessage = () => useAppStore(state => state.errorMessage);
const useSuccessMessage = () => useAppStore(state => state.successMessage);

// === 配置选择器 ===
export const useEditorConfig = () => useAppStore(state => state.editorConfig);
export const usePreviewConfig = () => useAppStore(state => state.previewConfig);

// === 复合选择器 ===
const useMessages = () => {
  const errorMessage = useAppStore(state => state.errorMessage);
  const successMessage = useAppStore(state => state.successMessage);
  return { errorMessage, successMessage };
};

const useLoadingStates = () => {
  const isGenerating = useAppStore(state => state.isGenerating);
  const isOptimizing = useAppStore(state => state.isOptimizing);
  const isSaving = useAppStore(state => state.isSaving);
  const isLoadingModels = useAppStore(state => state.isLoadingModels);
  return { isGenerating, isOptimizing, isSaving, isLoadingModels };
};

const useUIStates = () => {
  const modelSelectorOpen = useAppStore(state => state.modelSelectorOpen);
  const sidebarOpen = useAppStore(state => state.sidebarOpen);
  const showAddCustomModel = useAppStore(state => state.showAddCustomModel);
  const useDirectCall = useAppStore(state => state.useDirectCall);
  return { modelSelectorOpen, sidebarOpen, showAddCustomModel, useDirectCall };
};

// === Action Hooks ===

// 基础 Actions
const useDiagramActions = () => {
  const setCurrentDiagram = useAppStore(state => state.setCurrentDiagram);
  const setNaturalLanguageInput = useAppStore(state => state.setNaturalLanguageInput);
  
  const updateDiagram = (updates: Partial<DiagramData>) => {
    const currentDiagram = useAppStore.getState().currentDiagram;
    setCurrentDiagram({ ...currentDiagram, ...updates });
  };
  
  return {
    setCurrentDiagram,
    setNaturalLanguageInput,
    updateDiagram
  };
};

const useModelActions = () => {
  const setSelectedModel = useAppStore(state => state.setSelectedModel);
  const setAvailableModels = useAppStore(state => state.setAvailableModels);
  
  return {
    setSelectedModel,
    setAvailableModels
  };
};

// 加载状态 Actions
const useLoadingActions = () => {
  const setIsGenerating = useAppStore(state => state.setIsGenerating);
  const setIsOptimizing = useAppStore(state => state.setIsOptimizing);
  const setIsSaving = useAppStore(state => state.setIsSaving);
  const setIsLoadingModels = useAppStore(state => state.setIsLoadingModels);
  
  return {
    setIsGenerating,
    setIsOptimizing,
    setIsSaving,
    setIsLoadingModels
  };
};

// UI 状态 Actions
export const useUIActions = () => {
  const setModelSelectorOpen = useAppStore(state => state.setModelSelectorOpen);
  const setSidebarOpen = useAppStore(state => state.setSidebarOpen);
  const setShowAddCustomModel = useAppStore(state => state.setShowAddCustomModel);
  const setUseDirectCall = useAppStore(state => state.setUseDirectCall);
  const setIsInputPanelOpen = useAppStore(state => state.setIsInputPanelOpen);
  const setIsAIAssistantOpen = useAppStore(state => state.setIsAIAssistantOpen);
  
  const toggleSidebar = () => {
    const currentState = useAppStore.getState().sidebarOpen;
    setSidebarOpen(!currentState);
  };
  
  const toggleModelSelector = () => {
    const currentState = useAppStore.getState().modelSelectorOpen;
    setModelSelectorOpen(!currentState);
  };
  
  const toggleInputPanel = () => {
    const currentState = useAppStore.getState().isInputPanelOpen;
    setIsInputPanelOpen(!currentState);
  };
  
  const toggleAIAssistant = () => {
    const currentState = useAppStore.getState().isAIAssistantOpen;
    setIsAIAssistantOpen(!currentState);
  };
  
  return {
    setModelSelectorOpen,
    setSidebarOpen,
    setShowAddCustomModel,
    setUseDirectCall,
    setIsInputPanelOpen,
    setIsAIAssistantOpen,
    toggleSidebar,
    toggleModelSelector,
    toggleInputPanel,
    toggleAIAssistant
  };
};

// 消息 Actions
const useMessageActions = () => {
  const setErrorMessage = useAppStore(state => state.setErrorMessage);
  const setSuccessMessage = useAppStore(state => state.setSuccessMessage);
  const clearMessages = useAppStore(state => state.clearMessages);
  
  const showError = (message: string) => {
    setErrorMessage(message);
    // 5秒后自动清除错误消息
    setTimeout(() => setErrorMessage(null), 5000);
  };
  
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    // 3秒后自动清除成功消息
    setTimeout(() => setSuccessMessage(null), 3000);
  };
  
  return {
    setErrorMessage,
    setSuccessMessage,
    clearMessages,
    showError,
    showSuccess
  };
};

// 自定义模型 Actions
const useCustomModelActions = () => {
  const loadCustomModels = useAppStore(state => state.loadCustomModels);
  const saveCustomModel = useAppStore(state => state.saveCustomModel);
  const removeCustomModel = useAppStore(state => state.removeCustomModel);
  
  const saveAndCloseModal = (model: Omit<AIModelConfig, 'name'>) => {
    const result = saveCustomModel(model);
    if (result) {
      useAppStore.getState().setShowAddCustomModel(false);
    }
    return result;
  };
  
  return {
    loadCustomModels,
    saveCustomModel,
    removeCustomModel,
    saveAndCloseModal
  };
};

// DirectCall 配置 Actions
const useDirectCallActions = () => {
  const setDirectCallConfig = useAppStore(state => state.setDirectCallConfig);
  const updateDirectCallConfig = useAppStore(state => state.updateDirectCallConfig);
  
  return {
    setDirectCallConfig,
    updateDirectCallConfig
  };
};

// AI 响应 Actions
const useAiActions = () => {
  const setAiResponse = useAppStore(state => state.setAiResponse);
  
  const clearAiResponse = () => setAiResponse(null);
  
  return {
    setAiResponse,
    clearAiResponse
  };
};

// 历史记录 Actions
const useHistoryActions = () => {
  const setDiagramHistory = useAppStore(state => state.setDiagramHistory);
  
  const addToHistory = (diagram: DiagramData) => {
    const currentHistory = useAppStore.getState().diagramHistory;
    const newHistory = [diagram, ...currentHistory].slice(0, 50); // 保留最近50个
    setDiagramHistory(newHistory);
  };
  
  return {
    setDiagramHistory,
    addToHistory
  };
};

// === 组合 Hooks ===

// 模型选择相关的所有状态和操作
const useModelSelection = () => {
  const selectedModel = useSelectedModel();
  const availableModels = useAvailableModels();
  const { setSelectedModel } = useModelActions();
  const { loadCustomModels, saveCustomModel, removeCustomModel } = useCustomModelActions();
  
  return {
    selectedModel,
    availableModels,
    setSelectedModel,
    loadCustomModels,
    saveCustomModel,
    removeCustomModel
  };
};

// 输入面板相关的所有状态和操作
export const useInputPanel = () => {
  const naturalLanguageInput = useNaturalLanguageInput();
  const currentDiagram = useCurrentDiagram();
  const selectedModel = useSelectedModel();
  const availableModels = useAvailableModels();
  const isGenerating = useIsGenerating();
  const showAddCustomModel = useShowAddCustomModel();
  
  const { setCurrentDiagram, setNaturalLanguageInput } = useDiagramActions();
  const { setSelectedModel } = useModelActions();
  const { setShowAddCustomModel } = useUIActions();
  const { loadCustomModels } = useCustomModelActions();
  
  return {
    // 状态
    naturalLanguageInput,
    currentDiagram,
    selectedModel,
    availableModels,
    isGenerating,
    showAddCustomModel,
    // 操作
    setCurrentDiagram,
    setNaturalLanguageInput,
    setSelectedModel,
    setShowAddCustomModel,
    loadCustomModels
  };
};

// 添加自定义模型弹窗相关
export const useAddCustomModelModal = () => {
  const showAddCustomModel = useShowAddCustomModel();
  const { errorMessage, successMessage } = useMessages();
  
  const { setShowAddCustomModel } = useUIActions();
  const { saveAndCloseModal } = useCustomModelActions();
  const { showError, showSuccess, clearMessages } = useMessageActions();
  
  return {
    // 状态
    showAddCustomModel,
    errorMessage,
    successMessage,
    // 操作
    setShowAddCustomModel,
    saveAndCloseModal,
    showError,
    showSuccess,
    clearMessages
  };
};