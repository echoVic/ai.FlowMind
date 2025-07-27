/**
 * 输入面板组件
 * 使用 Zustand 状态管理，保持原有功能
 */
import { motion } from 'framer-motion';
import { Lightbulb, Plus, Settings, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useDiagramGenerator } from '@/lib/hooks/useDiagramGenerator';
import { useInputPanel } from '@/lib/stores/hooks';
import AddCustomModelModal from './AddCustomModelModal';
import DiagnosticPanel from './DiagnosticPanel';

const InputPanel: React.FC = () => {
  const {
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
  } = useInputPanel();
  
  const { generateDiagram } = useDiagramGenerator();
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // 加载自定义模型
  useEffect(() => {
    loadCustomModels();
  }, [loadCustomModels]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateDiagram();
  };

  const quickExamples = [
    '用户注册登录流程',
    '微服务架构设计', 
    '订单处理流程',
    '数据库ER图设计'
  ];

  const handleQuickExample = (example: string) => {
    setNaturalLanguageInput(example);
    generateDiagram(example);
  };

  // 默认模型选项（火山引擎模型）
  const defaultModelOptions = [
    { value: 'ep-20250530171222-q42h8', label: '🌋 DeepSeek-V3'},
    { value: 'ep-20250715105951-5rbzv', label: '🌋 Doubao-Seed-1.6-flash | 250615' },
    { value: 'ep-20250617131345-rshkp', label: '🌋 Doubao-Seed-1.6 | 250615' },
    { value: 'ep-20250612135125-br9k7', label: '🌋 Doubao-Seed-1.6-thinking | 250615' },
    { value: 'ep-20250417144747-rgffm', label: '🌋 Doubao-1.5-thinking-pro' },
    { value: 'ep-20250530171307-rrcc5', label: '🌋 DeepSeek-R1 | 250528' },
  ];

  // 获取图标
  const getProviderIcon = (provider: string) => {
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
      case 'qwen':
        return '🌟';
      default:
        return '⚙️';
    }
  };

  // 使用动态模型列表，如果没有则使用默认
  const modelOptions = availableModels.length > 0 
    ? availableModels.map(model => ({
        value: model.name,
        label: model.displayName,
        icon: model.icon || getProviderIcon(model.provider),
        isCustom: model.name.startsWith('custom_')
      }))
    : defaultModelOptions.map(opt => ({ ...opt, isCustom: false }));

  // 如果当前没有选择模型，自动选择第一个可用模型
  React.useEffect(() => {
    if (!selectedModel && modelOptions.length > 0) {
      setSelectedModel(modelOptions[0].value);
    }
  }, [selectedModel, modelOptions, setSelectedModel]);



  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h2 className="font-medium text-gray-900">描述需求</h2>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowDiagnostic(!showDiagnostic)}
              className="flex items-center space-x-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Settings size={12} />
              <span>诊断</span>
            </button>

            <select
              value={currentDiagram.diagramType}
              onChange={(e) => {
                const newDiagram = {
                  ...currentDiagram,
                  diagramType: e.target.value as any
                };
                setCurrentDiagram(newDiagram);
              }}
              className="text-xs border-0 bg-gray-100 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
            >
              <option value="flowchart">🔄 流程图</option>
              <option value="sequence">⏰ 时序图</option>
              <option value="class">🏗️ 类图</option>
              <option value="state">🚦 状态图</option>
              <option value="er">🗄️ ER图</option>
              <option value="journey">👤 旅程图</option>
              <option value="gantt">📅 甘特图</option>
              <option value="pie">🥧 饼图</option>
              <option value="quadrant">🎯 四象限图</option>
              <option value="mindmap">🧠 思维导图</option>
              <option value="gitgraph">🌳 Git图</option>
              <option value="kanban">📋 看板图</option>
              <option value="architecture">🏛️ 架构图</option>
              <option value="packet">📦 数据包图</option>
            </select>
          </div>
        </div>

        {/* AI模型选择 */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">AI模型</label>
            <button
              onClick={() => setShowAddCustomModel(true)}
              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 px-1.5 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              <Plus size={12} />
              <span>添加自定义</span>
            </button>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-transparent text-xs"
            disabled={isGenerating}
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}{option.isCustom ? ' (自定义)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 诊断面板 */}
          {showDiagnostic && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <DiagnosticPanel />
            </motion.div>
          )}
        </div>

        {/* 主输入区域 */}
        <div className="flex-1 p-4">
          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <textarea
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              placeholder="用自然语言描述您的架构需求，AI将为您生成专业的架构图..."
              className="flex-1 w-full p-3 border border-gray-200 rounded-md resize-none focus:ring-1 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isGenerating}
            />
            
            <div className="mt-4 flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {naturalLanguageInput.length}/500
              </span>
              
              <motion.button
                type="submit"
                disabled={isGenerating || !naturalLanguageInput.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>生成中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>生成架构图</span>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </div>

        {/* 快速示例 */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center space-x-2 mb-2">
            <Lightbulb className="text-amber-500" size={12} />
            <span className="text-xs font-medium text-gray-600">快速开始</span>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            {quickExamples.map((example, index) => (
              <motion.button
                key={index}
                onClick={() => handleQuickExample(example)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="text-left p-1.5 text-xs text-gray-600 bg-white rounded border border-gray-200 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                disabled={isGenerating}
              >
                {example}
              </motion.button>
            ))}
          </div>
        </div>

      {/* 添加自定义模型弹窗 */}
      <AddCustomModelModal />
    </div>
  );
};

export default InputPanel;