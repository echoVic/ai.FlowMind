import React, { useState, useEffect } from 'react';
import { Settings, Key, TestTube, History, Save, AlertCircle, CheckCircle, Trash2, Plus } from 'lucide-react';

// Types for AI model configuration
interface AIModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'qwen' | 'volcengine';
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
  isCustom: boolean;
}

interface DiagramHistory {
  id: string;
  title: string;
  description: string;
  diagramCode: string;
  modelUsed: string;
  createdAt: string;
}

interface OptionsState {
  models: AIModelConfig[];
  history: DiagramHistory[];
  preferences: {
    autoSave: boolean;
    maxHistoryItems: number;
    defaultTheme: 'light' | 'dark';
  };
}

const defaultModels: AIModelConfig[] = [
  {
    id: 'openai-gpt4',
    name: 'GPT-4',
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    isDefault: true,
    isCustom: false,
  },
  {
    id: 'anthropic-claude',
    name: 'Claude 3',
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 2048,
    isDefault: false,
    isCustom: false,
  },
  {
    id: 'qwen-turbo',
    name: 'Qwen Turbo',
    provider: 'qwen',
    apiKey: '',
    model: 'qwen-turbo',
    temperature: 0.7,
    maxTokens: 2048,
    isDefault: false,
    isCustom: false,
  },
];

const Options: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'models' | 'history' | 'preferences'>('models');
  const [options, setOptions] = useState<OptionsState>({
    models: defaultModels,
    history: [],
    preferences: {
      autoSave: true,
      maxHistoryItems: 50,
      defaultTheme: 'light',
    },
  });
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [testingModel, setTestingModel] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load options from Chrome storage
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const result = await chrome.storage.local.get(['flowmind_options']);
        if (result.flowmind_options) {
          setOptions(prev => ({
            ...prev,
            ...result.flowmind_options,
            models: result.flowmind_options.models || defaultModels,
          }));
        }
      } catch (error) {
        console.error('Failed to load options:', error);
      }
    };
    loadOptions();
  }, []);

  // Save options to Chrome storage
  const saveOptions = async () => {
    setIsSaving(true);
    try {
      await chrome.storage.local.set({ flowmind_options: options });
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Failed to save options:', error);
      setSaveMessage('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Test API connection
  const testApiConnection = async (model: AIModelConfig) => {
    setTestingModel(model.id);
    try {
      // Send test request to background script
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_API_CONNECTION',
        payload: {
          provider: model.provider,
          apiKey: model.apiKey,
          baseUrl: model.baseUrl,
          model: model.model,
        },
      });

      setTestResults(prev => ({
        ...prev,
        [model.id]: {
          success: response.success,
          message: response.message || (response.success ? 'Connection successful!' : 'Connection failed'),
        },
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [model.id]: {
          success: false,
          message: 'Test failed: ' + (error as Error).message,
        },
      }));
    } finally {
      setTestingModel(null);
    }
  };

  // Add new custom model
  const addCustomModel = () => {
    const newModel: AIModelConfig = {
      id: `custom-${Date.now()}`,
      name: 'Custom Model',
      provider: 'openai',
      apiKey: '',
      baseUrl: '',
      model: '',
      temperature: 0.7,
      maxTokens: 2048,
      isDefault: false,
      isCustom: true,
    };
    setEditingModel(newModel);
  };

  // Save model configuration
  const saveModel = (model: AIModelConfig) => {
    setOptions(prev => ({
      ...prev,
      models: editingModel?.id === model.id && !prev.models.find(m => m.id === model.id)
        ? [...prev.models, model]
        : prev.models.map(m => m.id === model.id ? model : m),
    }));
    setEditingModel(null);
  };

  // Delete model
  const deleteModel = (modelId: string) => {
    setOptions(prev => ({
      ...prev,
      models: prev.models.filter(m => m.id !== modelId),
    }));
  };

  // Clear history
  const clearHistory = () => {
    setOptions(prev => ({
      ...prev,
      history: [],
    }));
  };

  // Delete history item
  const deleteHistoryItem = (historyId: string) => {
    setOptions(prev => ({
      ...prev,
      history: prev.history.filter(h => h.id !== historyId),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">FlowMind Settings</h1>
                <p className="text-gray-600">Configure AI models and manage your preferences</p>
              </div>
            </div>
            <button
              onClick={saveOptions}
              disabled={isSaving}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save All'}</span>
            </button>
          </div>
          {saveMessage && (
            <div className={`mt-4 p-3 rounded-lg flex items-center space-x-2 ${
              saveMessage.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {saveMessage.includes('success') ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{saveMessage}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'models', label: 'AI Models', icon: Key },
                { id: 'history', label: 'History', icon: History },
                { id: 'preferences', label: 'Preferences', icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* AI Models Tab */}
            {activeTab === 'models' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">AI Model Configuration</h2>
                  <button
                    onClick={addCustomModel}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Custom Model</span>
                  </button>
                </div>

                <div className="grid gap-4">
                  {options.models.map((model) => (
                    <div key={model.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium text-gray-900">{model.name}</h3>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {model.provider}
                          </span>
                          {model.isDefault && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => testApiConnection(model)}
                            disabled={testingModel === model.id || !model.apiKey}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                          >
                            <TestTube className="w-4 h-4" />
                            <span>{testingModel === model.id ? 'Testing...' : 'Test'}</span>
                          </button>
                          <button
                            onClick={() => setEditingModel(model)}
                            className="text-gray-600 hover:text-gray-700"
                          >
                            Edit
                          </button>
                          {model.isCustom && (
                            <button
                              onClick={() => deleteModel(model.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>Model: {model.model}</div>
                        <div>Temperature: {model.temperature}</div>
                        <div>Max Tokens: {model.maxTokens}</div>
                        <div>API Key: {model.apiKey ? '••••••••' : 'Not configured'}</div>
                      </div>

                      {testResults[model.id] && (
                        <div className={`mt-3 p-2 rounded text-sm flex items-center space-x-2 ${
                          testResults[model.id].success
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {testResults[model.id].success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                          <span>{testResults[model.id].message}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Generation History</h2>
                  <button
                    onClick={clearHistory}
                    className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                </div>

                {options.history.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No generation history yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {options.history.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          <button
                            onClick={() => deleteHistoryItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Model: {item.modelUsed}</span>
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-medium text-gray-900">Auto-save diagrams</label>
                      <p className="text-sm text-gray-600">Automatically save generated diagrams to history</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={options.preferences.autoSave}
                      onChange={(e) => setOptions(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, autoSave: e.target.checked }
                      }))}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-900 mb-2">
                      Maximum history items
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={options.preferences.maxHistoryItems}
                      onChange={(e) => setOptions(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, maxHistoryItems: parseInt(e.target.value) }
                      }))}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-gray-900 mb-2">
                      Default theme
                    </label>
                    <select
                      value={options.preferences.defaultTheme}
                      onChange={(e) => setOptions(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, defaultTheme: e.target.value as 'light' | 'dark' }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Model Edit Modal */}
        {editingModel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingModel.isCustom ? 'Add Custom Model' : 'Edit Model'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={editingModel.name}
                    onChange={(e) => setEditingModel(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={editingModel.provider}
                    onChange={(e) => setEditingModel(prev => prev ? { ...prev, provider: e.target.value as any } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="qwen">Qwen</option>
                    <option value="volcengine">Volcengine</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type="password"
                    value={editingModel.apiKey}
                    onChange={(e) => setEditingModel(prev => prev ? { ...prev, apiKey: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={editingModel.model}
                    onChange={(e) => setEditingModel(prev => prev ? { ...prev, model: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base URL (optional)</label>
                  <input
                    type="text"
                    value={editingModel.baseUrl || ''}
                    onChange={(e) => setEditingModel(prev => prev ? { ...prev, baseUrl: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={editingModel.temperature}
                      onChange={(e) => setEditingModel(prev => prev ? { ...prev, temperature: parseFloat(e.target.value) } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
                    <input
                      type="number"
                      min="100"
                      max="8192"
                      value={editingModel.maxTokens}
                      onChange={(e) => setEditingModel(prev => prev ? { ...prev, maxTokens: parseInt(e.target.value) } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingModel(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => editingModel && saveModel(editingModel)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Options;