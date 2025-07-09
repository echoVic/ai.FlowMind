/**
 * AI模型选择器组件
 * 集成连接验证功能，增强用户体验
 */
import React, { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Bot, Zap, Settings, Check, Key, Wifi } from 'lucide-react';
import {
  availableModelsAtom,
  selectedModelAtom,
  modelSelectorOpenAtom,
  useDirectCallAtom,
  directCallConfigAtom,
  isLoadingModelsAtom
} from '../../../stores/diagramStore';
import { useModelManager } from '../../../hooks/useModelManager';
import { useDiagramGenerator } from '../../../hooks/useDiagramGenerator';
import ValidationPanel from '../ValidationPanel';
import type { AIModelConfig } from '../../../shared/types';

const ModelSelector: React.FC = () => {
  const [availableModels] = useAtom(availableModelsAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [isOpen, setIsOpen] = useAtom(modelSelectorOpenAtom);
  const [useDirectCall, setUseDirectCall] = useAtom(useDirectCallAtom);
  const [directCallConfig, setDirectCallConfig] = useAtom(directCallConfigAtom);
  const [isLoadingModels] = useAtom(isLoadingModelsAtom);
  const [showConfig, setShowConfig] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const { loadModels } = useModelManager();
  const { validateConnection } = useDiagramGenerator();

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const selectedModelInfo = availableModels.find(m => m.name === selectedModel);

  const handleModelSelect = (modelName: string) => {
    setSelectedModel(modelName);
    setIsOpen(false);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'volcengine':
        return '🌋';
      case 'openai':
        return '🤖';
      case 'claude':
        return '🧠';
      default:
        return '⚡';
    }
  };

  const handleDirectCallToggle = (enabled: boolean) => {
    setUseDirectCall(enabled);
    if (enabled) {
      setShowConfig(true);
    }
  };

  const updateDirectCallConfig = (provider: string, config: any) => {
    setDirectCallConfig(prev => ({
      ...prev,
      [provider]: config
    }));
  };

  // 快速验证连接
  const handleQuickValidate = async () => {
    if (!useDirectCall) {
      return;
    }
    
    const modelInfo = availableModels.find(m => m.name === selectedModel);
    if (!modelInfo) {
      return;
    }

    const providerConfig = directCallConfig[modelInfo.provider];
    if (!providerConfig?.apiKey) {
      setShowConfig(true);
      return;
    }

    await validateConnection();
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        {/* 模型选择器按钮 */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-[200px]"
        >
          <div className="flex items-center space-x-2 flex-1">
            <div className="text-lg">
              {selectedModelInfo ? getProviderIcon(selectedModelInfo.provider) : '🤖'}
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-gray-900">
                {selectedModelInfo?.displayName || selectedModel}
              </div>
              <div className="text-xs text-gray-500">
                {selectedModelInfo?.provider.toUpperCase()} {useDirectCall && '• 直连'}
              </div>
            </div>
          </div>
          <ChevronDown 
            size={16} 
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </motion.button>

        {/* 下拉面板 */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
            >
              {/* 调用方式选择 */}
              <div className="p-3 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-700 mb-2">调用方式</div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!useDirectCall}
                      onChange={() => handleDirectCallToggle(false)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-600">服务端转发（推荐）</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={useDirectCall}
                      onChange={() => handleDirectCallToggle(true)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-600">前端直连（需配置API密钥）</span>
                  </label>
                </div>
              </div>

              {/* 模型列表 */}
              <div className="p-2">
                <div className="text-xs font-medium text-gray-700 mb-2 px-2">可用模型</div>
                {isLoadingModels ? (
                  <div className="text-center py-4">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <div className="text-xs text-gray-500">加载模型中...</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {availableModels.map((model) => (
                      <motion.button
                        key={model.name}
                        onClick={() => handleModelSelect(model.name)}
                        whileHover={{ backgroundColor: '#f8fafc' }}
                        className="w-full flex items-center space-x-3 p-2 rounded-lg text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-lg">
                          {getProviderIcon(model.provider)}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {model.displayName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {model.description}
                          </div>
                        </div>
                        {selectedModel === model.name && (
                          <Check size={16} className="text-blue-600" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="p-3 border-t border-gray-100 flex justify-between">
                {useDirectCall && (
                  <button
                    onClick={() => setShowConfig(true)}
                    className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Settings size={14} />
                    <span>配置API密钥</span>
                  </button>
                )}
                
                <button
                  onClick={() => setShowValidation(!showValidation)}
                  className="flex items-center space-x-2 text-sm text-green-600 hover:text-green-700"
                >
                  <Wifi size={14} />
                  <span>验证连接</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 配置弹窗 */}
        <AnimatePresence>
          {showConfig && useDirectCall && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]"
              onClick={() => setShowConfig(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <Key size={20} className="text-blue-600" />
                  <h3 className="text-lg font-medium text-gray-900">API密钥配置</h3>
                </div>

                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                    🔒 您的API密钥将安全存储在浏览器本地，不会发送到我们的服务器
                  </div>

                  {Array.from(new Set(availableModels.map(m => m.provider))).map(provider => (
                    <div key={provider} className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 capitalize flex items-center space-x-2">
                        <span>{getProviderIcon(provider)}</span>
                        <span>{provider} API Key</span>
                      </label>
                      <input
                        type="password"
                        placeholder={`输入${provider}的API密钥`}
                        value={directCallConfig[provider]?.apiKey || ''}
                        onChange={(e) => updateDirectCallConfig(provider, {
                          ...directCallConfig[provider],
                          apiKey: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {provider === 'volcengine' && (
                        <div className="text-xs text-gray-500">
                          使用火山引擎的 ARK_API_KEY，支持 OpenAI SDK 格式调用
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center mt-6">
                  <button
                    onClick={handleQuickValidate}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-green-600 hover:text-green-700"
                  >
                    <Wifi size={14} />
                    <span>验证连接</span>
                  </button>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowConfig(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => setShowConfig(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 验证面板 */}
      {showValidation && <ValidationPanel />}
    </div>
  );
};

export default ModelSelector;