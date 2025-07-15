/**
 * AI助手组件
 * 使用 Zustand 状态管理，提供智能建议和优化功能
 */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send } from 'lucide-react';
import { useAiResponse, useIsOptimizing } from '../../../stores/hooks';
import { useDiagramGenerator } from '../../../hooks/useDiagramGenerator';

const AIAssistant: React.FC = () => {
  const aiResponse = useAiResponse();
  const isOptimizing = useIsOptimizing();
  const [inputValue, setInputValue] = useState('');
  const { optimizeDiagram } = useDiagramGenerator();

  const handleOptimize = () => {
    if (inputValue.trim()) {
      optimizeDiagram(inputValue);
      setInputValue('');
    }
  };

  const quickSuggestions = [
    '添加更多细节',
    '优化布局',
    '简化流程',
    '增加错误处理'
  ];

  const handleQuickSuggestion = (suggestion: string) => {
    optimizeDiagram(suggestion);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 简洁标题 */}
      <div className="p-4 border-b border-gray-50">
        <div className="flex items-center space-x-2">
          <Bot className="text-purple-500" size={16} />
          <h3 className="font-medium text-gray-900 text-sm">AI 优化助手</h3>
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
        </div>
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {aiResponse ? (
          <div className="mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-sm text-gray-700 mb-2">
                {aiResponse.explanation}
              </p>
              {aiResponse.suggestions.length > 0 && (
                <ul className="text-xs text-gray-600 space-y-1">
                  {aiResponse.suggestions.slice(0, 2).map((suggestion, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 mr-2 flex-shrink-0"></span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Bot size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-xs text-gray-500">我可以帮您优化架构图</p>
          </div>
        )}

        {/* 快速优化选项 */}
        <div className="grid grid-cols-2 gap-2">
          {quickSuggestions.map((suggestion, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleQuickSuggestion(suggestion)}
              disabled={isOptimizing}
              className="text-left p-2 text-xs text-gray-600 bg-gray-50 rounded hover:bg-purple-50 hover:text-purple-600 transition-colors disabled:opacity-50"
            >
              {suggestion}
            </motion.button>
          ))}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-t border-gray-50">
        <div className="flex items-center space-x-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="告诉我如何优化..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-purple-500 focus:border-transparent"
            disabled={isOptimizing}
            onKeyDown={(e) => e.key === 'Enter' && handleOptimize()}
          />
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleOptimize}
            disabled={isOptimizing || !inputValue.trim()}
            className="p-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isOptimizing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={14} />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;