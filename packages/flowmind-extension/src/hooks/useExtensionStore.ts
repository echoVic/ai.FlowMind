import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  DiagramData,
  AIModelConfig,
  DirectCallConfig
} from '@flowmind/shared-types';

// Chrome storage adapter for Zustand persist
const chromeStorage = {
  getItem: (name: string): Promise<string | null> =>
    new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get([name], (result) => {
          resolve(result[name] ?? null);
        });
      } else {
        // Fallback to localStorage for development
        resolve(localStorage.getItem(name));
      }
    }),
  setItem: (name: string, value: string): Promise<void> =>
    new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ [name]: value }, () => resolve());
      } else {
        // Fallback to localStorage for development
        localStorage.setItem(name, value);
        resolve();
      }
    }),
  removeItem: (name: string): Promise<void> =>
    new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.remove([name], () => resolve());
      } else {
        // Fallback to localStorage for development
        localStorage.removeItem(name);
        resolve();
      }
    }),
};

// Extension-specific state interface
interface ExtensionState {
  // Diagram data
  currentDiagram: DiagramData | null;
  diagramHistory: DiagramData[];
  
  // AI model configuration
  modelConfigs: AIModelConfig[];
  selectedModelId: string | null;
  
  // User preferences
  preferences: {
    theme: 'light' | 'dark' | 'system';
    autoSave: boolean;
    showPreview: boolean;
    defaultDiagramType: string;
    maxHistoryItems: number;
  };
  
  // UI state
  isGenerating: boolean;
  isOptimizing: boolean;
  error: string | null;
  
  // Extension-specific settings
  extensionSettings: {
    popupSize: { width: number; height: number };
    enableNotifications: boolean;
    syncWithWeb: boolean;
  };
}

// Actions interface
interface ExtensionActions {
  // Diagram actions
  setCurrentDiagram: (diagram: DiagramData | null) => void;
  addToHistory: (diagram: DiagramData) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
  
  // Model configuration actions
  addModelConfig: (config: AIModelConfig) => void;
  updateModelConfig: (id: string, config: Partial<AIModelConfig>) => void;
  removeModelConfig: (id: string) => void;
  setSelectedModel: (id: string | null) => void;
  
  // Preference actions
  updatePreferences: (preferences: Partial<ExtensionState['preferences']>) => void;
  resetPreferences: () => void;
  
  // UI state actions
  setGenerating: (isGenerating: boolean) => void;
  setOptimizing: (isOptimizing: boolean) => void;
  setError: (error: string | null) => void;
  
  // Extension settings actions
  updateExtensionSettings: (settings: Partial<ExtensionState['extensionSettings']>) => void;
  
  // Utility actions
  reset: () => void;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
}

type ExtensionStore = ExtensionState & ExtensionActions;

// Default state
const defaultState: ExtensionState = {
  currentDiagram: null,
  diagramHistory: [],
  modelConfigs: [
    {
      id: 'openai-gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      model: 'gpt-4',
      apiKey: '',
      baseURL: 'https://api.openai.com/v1',
      temperature: 0.7,
      maxTokens: 4000,
      isDefault: true,
    },
    {
      id: 'anthropic-claude-3',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229',
      apiKey: '',
      baseURL: 'https://api.anthropic.com',
      temperature: 0.7,
      maxTokens: 4000,
      isDefault: false,
    },
  ],
  selectedModelId: 'openai-gpt-4',
  preferences: {
    theme: 'system',
    autoSave: true,
    showPreview: true,
    defaultDiagramType: 'flowchart',
    maxHistoryItems: 50,
  },
  isGenerating: false,
  isOptimizing: false,
  error: null,
  extensionSettings: {
    popupSize: { width: 400, height: 600 },
    enableNotifications: true,
    syncWithWeb: false,
  },
};

// Create the store
export const useExtensionStore = create<ExtensionStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      
      // Diagram actions
      setCurrentDiagram: (diagram) => set({ currentDiagram: diagram }),
      
      addToHistory: (diagram) => set((state) => {
        const newHistory = [diagram, ...state.diagramHistory];
        const maxItems = state.preferences.maxHistoryItems;
        return {
          diagramHistory: newHistory.slice(0, maxItems),
        };
      }),
      
      clearHistory: () => set({ diagramHistory: [] }),
      
      removeFromHistory: (id) => set((state) => ({
        diagramHistory: state.diagramHistory.filter(d => d.id !== id),
      })),
      
      // Model configuration actions
      addModelConfig: (config) => set((state) => ({
        modelConfigs: [...state.modelConfigs, config],
      })),
      
      updateModelConfig: (id, updates) => set((state) => ({
        modelConfigs: state.modelConfigs.map(config =>
          config.id === id ? { ...config, ...updates } : config
        ),
      })),
      
      removeModelConfig: (id) => set((state) => {
        const newConfigs = state.modelConfigs.filter(config => config.id !== id);
        const newSelectedId = state.selectedModelId === id 
          ? newConfigs.find(c => c.isDefault)?.id || newConfigs[0]?.id || null
          : state.selectedModelId;
        
        return {
          modelConfigs: newConfigs,
          selectedModelId: newSelectedId,
        };
      }),
      
      setSelectedModel: (id) => set({ selectedModelId: id }),
      
      // Preference actions
      updatePreferences: (preferences) => set((state) => ({
        preferences: { ...state.preferences, ...preferences },
      })),
      
      resetPreferences: () => set({ preferences: defaultState.preferences }),
      
      // UI state actions
      setGenerating: (isGenerating) => set({ isGenerating }),
      setOptimizing: (isOptimizing) => set({ isOptimizing }),
      setError: (error) => set({ error }),
      
      // Extension settings actions
      updateExtensionSettings: (settings) => set((state) => ({
        extensionSettings: { ...state.extensionSettings, ...settings },
      })),
      
      // Utility actions
      reset: () => set(defaultState),
      
      exportData: async () => {
        const state = get();
        const exportData = {
          diagramHistory: state.diagramHistory,
          modelConfigs: state.modelConfigs.map(config => ({
            ...config,
            apiKey: '', // Don't export API keys for security
          })),
          preferences: state.preferences,
          extensionSettings: state.extensionSettings,
          exportedAt: new Date().toISOString(),
        };
        return JSON.stringify(exportData, null, 2);
      },
      
      importData: async (data) => {
        try {
          const importedData = JSON.parse(data);
          set((state) => ({
            diagramHistory: importedData.diagramHistory || state.diagramHistory,
            modelConfigs: importedData.modelConfigs || state.modelConfigs,
            preferences: { ...state.preferences, ...importedData.preferences },
            extensionSettings: { ...state.extensionSettings, ...importedData.extensionSettings },
          }));
        } catch (error) {
          throw new Error('Invalid import data format');
        }
      },
    }),
    {
      name: 'flowmind-extension-store',
      storage: chromeStorage,
      partialize: (state) => ({
        // Only persist certain parts of the state
        diagramHistory: state.diagramHistory,
        modelConfigs: state.modelConfigs,
        selectedModelId: state.selectedModelId,
        preferences: state.preferences,
        extensionSettings: state.extensionSettings,
        // Don't persist UI state like isGenerating, error, etc.
      }),
    }
  )
);

// Utility hooks for specific parts of the store
export const useCurrentDiagram = () => useExtensionStore(state => state.currentDiagram);
export const useDiagramHistory = () => useExtensionStore(state => state.diagramHistory);
export const useModelConfigs = () => useExtensionStore(state => state.modelConfigs);
export const useSelectedModel = () => useExtensionStore(state => {
  const configs = state.modelConfigs;
  const selectedId = state.selectedModelId;
  return configs.find(config => config.id === selectedId) || null;
});
export const usePreferences = () => useExtensionStore(state => state.preferences);
export const useExtensionSettings = () => useExtensionStore(state => state.extensionSettings);
export const useUIState = () => useExtensionStore(state => ({
  isGenerating: state.isGenerating,
  isOptimizing: state.isOptimizing,
  error: state.error,
}));

// Actions hooks
export const useDiagramActions = () => useExtensionStore(state => ({
  setCurrentDiagram: state.setCurrentDiagram,
  addToHistory: state.addToHistory,
  clearHistory: state.clearHistory,
  removeFromHistory: state.removeFromHistory,
}));

export const useModelActions = () => useExtensionStore(state => ({
  addModelConfig: state.addModelConfig,
  updateModelConfig: state.updateModelConfig,
  removeModelConfig: state.removeModelConfig,
  setSelectedModel: state.setSelectedModel,
}));

export const useUIActions = () => useExtensionStore(state => ({
  setGenerating: state.setGenerating,
  setOptimizing: state.setOptimizing,
  setError: state.setError,
}));

export const useStoreActions = () => useExtensionStore(state => ({
  updatePreferences: state.updatePreferences,
  resetPreferences: state.resetPreferences,
  updateExtensionSettings: state.updateExtensionSettings,
  reset: state.reset,
  exportData: state.exportData,
  importData: state.importData,
}));