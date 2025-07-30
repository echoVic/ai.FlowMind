'use client';

/**
 * 架构图生成器主组件
 * 使用 Zustand 状态管理，整合所有功能模块
 */
import { useModelManager } from '@/lib/hooks/useModelManager';
import { useSidebarOpen } from '@/lib/stores/hooks';
import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import ConversationalDiagramPanel from '../chat/ConversationalDiagramPanel';
import FloatWindow from '../ui/FloatWindow';
import CodeEditor from './CodeEditor';
import DiagramPreview from './DiagramPreview';
import Header from './Header';
import Sidebar from './Sidebar';

const DiagramGenerator: React.FC = () => {
  const sidebarOpen = useSidebarOpen();
  const { loadModels } = useModelManager();
  const [isConversationOpen, setIsConversationOpen] = useState(false);


  // 加载AI模型
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // 处理快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Space 打开/关闭对话面板
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setIsConversationOpen(!isConversationOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isConversationOpen]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 320 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="bg-white shadow-sm overflow-hidden border-r border-gray-100"
      >
        <Sidebar />
      </motion.div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col">
        {/* 头部 */}
        <Header />

        {/* 核心工作区 - 简化为两栏布局 */}
        <div className="flex-1 flex bg-white overflow-auto">
          {/* 左栏：代码编辑 - 占据1/3 */}
          <div className="w-1/3 border-r border-gray-100">
            <CodeEditor />
          </div>

          {/* 右栏：实时预览 - 占据2/3 */}
          <div className="w-2/3">
            <DiagramPreview />
          </div>
        </div>
      </div>
      
      {/* 悬浮窗 */}
      <FloatWindow 
        isOpen={isConversationOpen} 
        onClose={() => setIsConversationOpen(false)}
      >
        <ConversationalDiagramPanel />
      </FloatWindow>
      
      {/* 右下角圆形按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          // 切换对话面板
          setIsConversationOpen(!isConversationOpen);
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-600 transition-colors z-30"
      >
        <Bot size={24} />
      </motion.button>
    </div>
  );
};

export default DiagramGenerator;