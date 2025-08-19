/**
 * 对话工作区组件
 * AI对话的核心区域，包含聊天界面和快速操作
 */
import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Zap, History, Settings } from 'lucide-react';
import ConversationalDiagramPanel from '../chat';

interface ConversationalWorkspaceProps {
  className?: string;
}

const ConversationalWorkspace: React.FC<ConversationalWorkspaceProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 快速操作栏 */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/50 backdrop-blur-sm border-b border-gray-200 px-6 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium text-gray-800 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <span>AI 对话</span>
            </h2>
            <div className="text-sm text-gray-500">
              与 AI 自然对话，生成和优化流程图
            </div>
          </div>
          
          {/* 快速操作按钮 */}
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="快速生成"
            >
              <Zap className="w-4 h-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="对话历史"
            >
              <History className="w-4 h-4" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="对话设置"
            >
              <Settings className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
      
      {/* 主对话区域 */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 bg-gradient-to-br from-blue-50/30 to-purple-50/30 relative overflow-hidden"
      >
        {/* 背景装饰 */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="absolute top-10 right-10 w-32 h-32 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-24 h-24 bg-purple-200/20 rounded-full blur-2xl" />
        
        {/* 对话面板 */}
        <div className="relative z-10 h-full p-6">
          <div className="h-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 overflow-hidden">
            <ConversationalDiagramPanel />
          </div>
        </div>
      </motion.div>
      
      {/* 底部状态栏 */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white/50 backdrop-blur-sm border-t border-gray-200 px-6 py-2"
      >
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>AI 就绪</span>
            </span>
            <span>支持自然语言描述、图表优化、代码生成</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span>快捷键：Ctrl + Enter 发送</span>
            <span>Ctrl + / 帮助</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ConversationalWorkspace;