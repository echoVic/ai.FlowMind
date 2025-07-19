import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wand2, 
  Settings, 
  Download, 
  Copy, 
  RefreshCw, 
  Sparkles,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useExtensionStore } from '../hooks/useExtensionStore';
import DiagramPreview from './components/DiagramPreview';

// Quick example prompts
const QUICK_EXAMPLES = [
  "用户登录流程",
  "订单处理系统",
  "数据备份流程",
  "CI/CD 部署流程",
  "用户注册验证",
  "支付处理流程"
];

// AI Model options
const AI_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic' },
  { id: 'qwen-max', name: 'Qwen Max', provider: 'Alibaba' },
  { id: 'doubao-pro', name: 'Doubao Pro', provider: 'Volcengine' }
];

const Popup: React.FC = () => {
  const {
    prompt,
    setPrompt,
    selectedModel,
    setSelectedModel,
    diagramData,
    isGenerating,
    generateDiagram,
    optimizeDiagram,
    clearDiagram,
    modelConfigs,
    loadConfigs
  } = useExtensionStore();

  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  // Load configurations on mount
  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('请输入流程描述');
      return;
    }

    if (!selectedModel) {
      toast.error('请选择AI模型');
      return;
    }

    try {
      await generateDiagram(prompt, selectedModel);
      toast.success('图表生成成功！');
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('生成失败，请检查配置或重试');
    }
  };

  const handleOptimize = async () => {
    if (!diagramData) {
      toast.error('请先生成图表');
      return;
    }

    try {
      await optimizeDiagram();
      toast.success('图表优化成功！');
    } catch (error) {
      console.error('Optimization error:', error);
      toast.error('优化失败，请重试');
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    setShowExamples(false);
  };

  const handleCopyCode = () => {
    if (diagramData?.code) {
      navigator.clipboard.writeText(diagramData.code);
      toast.success('代码已复制到剪贴板');
    }
  };

  const handleDownload = () => {
    if (diagramData?.code) {
      const blob = new Blob([diagramData.code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flowchart.mmd';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('文件下载成功');
    }
  };

  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage();
  };

  const selectedModelInfo = AI_MODELS.find(m => m.id === selectedModel);
  const hasValidConfig = selectedModel && modelConfigs[selectedModel];

  return (
    <div className="w-[400px] h-[600px] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-semibold text-gray-900">FlowMind</h1>
        </div>
        <button
          onClick={openOptionsPage}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="设置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Input Section */}
        <div className="p-4 space-y-4">
          {/* Prompt Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              描述你想要的流程图
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="例如：用户登录流程，包括输入验证、身份认证和权限检查..."
                className="w-full h-20 px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isGenerating}
              />
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="absolute bottom-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="快速示例"
              >
                <Wand2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <AnimatePresence>
            {showExamples && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="text-xs text-gray-500">快速示例：</div>
                <div className="flex flex-wrap gap-1">
                  {QUICK_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      onClick={() => handleExampleClick(example)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              AI 模型
            </label>
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors flex items-center justify-between"
                disabled={isGenerating}
              >
                <div className="flex-1">
                  {selectedModelInfo ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-900">{selectedModelInfo.name}</span>
                      <span className="text-xs text-gray-500">({selectedModelInfo.provider})</span>
                      {!hasValidConfig && (
                        <span className="text-xs text-red-500">未配置</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">选择模型</span>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>

              <AnimatePresence>
                {showModelDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                  >
                    {AI_MODELS.map((model) => {
                      const isConfigured = modelConfigs[model.id];
                      return (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.id);
                            setShowModelDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm text-gray-900">{model.name}</div>
                            <div className="text-xs text-gray-500">{model.provider}</div>
                          </div>
                          {!isConfigured && (
                            <span className="text-xs text-red-500">未配置</span>
                          )}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || !hasValidConfig}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>生成中...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>生成图表</span>
                </>
              )}
            </button>

            {diagramData && (
              <button
                onClick={handleOptimize}
                disabled={isGenerating}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                title="优化图表"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Config Warning */}
          {selectedModel && !hasValidConfig && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="text-sm text-yellow-800">
                  请先在设置页面配置 {selectedModelInfo?.name} 的 API 密钥
                </div>
                <button
                  onClick={openOptionsPage}
                  className="text-yellow-600 hover:text-yellow-800"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {diagramData && (
          <div className="flex-1 border-t border-gray-200 flex flex-col">
            <div className="flex items-center justify-between p-3 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700">预览</h3>
              <div className="flex space-x-1">
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="复制代码"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                  title="下载文件"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <DiagramPreview 
                diagramData={diagramData}
                onOptimize={handleOptimize}
                isOptimizing={isGenerating}
              />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!diagramData && !isGenerating && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">
                输入描述并选择模型开始生成流程图
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Popup;