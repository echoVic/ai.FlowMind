'use client';

/**
 * AI 助手头部组件
 * 展示AI身份、状态和基本控制
 */
import { motion } from 'framer-motion';
import { Bot, Sparkles, Settings } from 'lucide-react';
import React from 'react';

interface AIHeaderProps {}

const AIHeader: React.FC<AIHeaderProps> = () => {

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* 左侧：AI 身份标识 */}
        <div className="flex items-center space-x-4">
          {/* AI 头像 */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="relative"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            {/* 活跃状态指示器 */}
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"
            />
          </motion.div>
          
          {/* AI 信息 */}
          <div>
            <h1 className="text-xl font-semibold text-gray-800 flex items-center space-x-2">
              <span>FlowMind AI</span>
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              智能图表生成助手
            </p>
          </div>
        </div>
        
        {/* 中间：AI 状态信息 */}
        <div className="hidden md:flex items-center space-x-6">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">Ready</div>
            <div className="text-xs text-gray-500">AI 状态</div>
          </div>
          
          <div className="w-px h-8 bg-gray-300" />
          
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">Online</div>
            <div className="text-xs text-gray-500">连接状态</div>
          </div>
        </div>
        
        {/* 右侧：控制按钮 */}
        <div className="flex items-center space-x-3">
          {/* 设置按钮 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
            title="AI 设置"
          >
            <Settings size={20} />
          </motion.button>
        </div>
      </div>
      
      {/* AI 欢迎消息（可选显示）*/}
      <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
      >
        <p className="text-sm text-blue-800">
          👋 你好！我是 FlowMind AI，专门帮助你创建各种图表和架构图。直接告诉我你想要什么，我来帮你实现！
        </p>
      </motion.div>
    </motion.header>
  );
};

export default AIHeader;