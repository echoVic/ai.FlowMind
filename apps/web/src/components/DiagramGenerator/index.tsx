/**
 * 架构图生成器主组件
 * 使用 Zustand 状态管理，整合所有功能模块
 */
import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useIsAIAssistantOpen, useIsInputPanelOpen, useSidebarOpen, useUIActions } from '../../stores/hooks';
import AIAssistant from './AIAssistant';
import CodeEditor from './CodeEditor';
import DiagramPreview from './DiagramPreview';
import FloatWindow from './FloatWindow';
import Header from './Header';
import InputPanel from './InputPanel';
import Sidebar from './Sidebar';

const DiagramGenerator: React.FC = () => {
  const sidebarOpen = useSidebarOpen();
  const isInputPanelOpen = useIsInputPanelOpen();
  const isAIAssistantOpen = useIsAIAssistantOpen();
  const { toggleInputPanel, toggleAIAssistant } = useUIActions();
  const [activePanel, setActivePanel] = useState<'input' | 'ai'>('input');
  const [isFloatWindowMinimized, setIsFloatWindowMinimized] = useState(false);

  // 处理快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Space 打开/关闭 AI 助手
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        toggleAIAssistant();
      }
      
      // Ctrl + Shift + Space 打开/关闭 输入面板
      if (e.ctrlKey && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        toggleInputPanel();
        setActivePanel('input');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toggleAIAssistant, toggleInputPanel]);

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
        isOpen={isInputPanelOpen || isAIAssistantOpen} 
        onClose={() => {
          if (activePanel === 'input') {
            toggleInputPanel();
          } else {
            toggleAIAssistant();
          }
        }} 
        activePanel={activePanel}
        onPanelChange={(panel) => {
          // 如果当前面板是关闭的，需要打开它
          if (panel === 'input' && !isInputPanelOpen) {
            toggleInputPanel();
          } else if (panel === 'ai' && !isAIAssistantOpen) {
            toggleAIAssistant();
          }
          setActivePanel(panel);
        }}
        isMinimized={isFloatWindowMinimized}
        onMinimizeToggle={() => setIsFloatWindowMinimized(!isFloatWindowMinimized)}
      >
        {activePanel === 'input' ? <InputPanel /> : <AIAssistant />}
      </FloatWindow>
      
      {/* 右下角圆形按钮 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          // 如果浮窗被最小化了，恢复它
          if (isFloatWindowMinimized) {
            setIsFloatWindowMinimized(false);
            return;
          }
          
          if (activePanel === 'input') {
            // 如果两个面板都关闭了，确保输入面板被打开
            if (!isInputPanelOpen && !isAIAssistantOpen) {
              toggleInputPanel();
            } else {
              toggleInputPanel();
            }
          } else {
            // 如果两个面板都关闭了，确保AI助手被打开
            if (!isInputPanelOpen && !isAIAssistantOpen) {
              toggleAIAssistant();
            } else {
              toggleAIAssistant();
            }
          }
        }}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-500 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-600 transition-colors z-30"
      >
        <Bot size={24} />
      </motion.button>
    </div>
  );
};

export default DiagramGenerator;