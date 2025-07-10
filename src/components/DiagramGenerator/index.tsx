/**
 * 架构图生成器主组件
 * 使用 Zustand 状态管理，整合所有功能模块
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useSidebarOpen } from '../../stores/hooks';
import InputPanel from './InputPanel';
import CodeEditor from './CodeEditor';
import DiagramPreview from './DiagramPreview';
import Sidebar from './Sidebar';
import Header from './Header';
import AIAssistant from './AIAssistant';

const DiagramGenerator: React.FC = () => {
  const sidebarOpen = useSidebarOpen();

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

        {/* 核心工作区 - 三栏布局 */}
        <div className="flex-1 flex bg-white">
          {/* 左栏：输入与生成 */}
          <div className="w-1/3 flex flex-col border-r border-gray-100">
            <InputPanel />
            
            {/* AI助手卡片 */}
            <div className="h-64 border-t border-gray-100">
              <AIAssistant />
            </div>
          </div>

          {/* 中栏：代码编辑 */}
          <div className="w-1/3 border-r border-gray-100">
            <CodeEditor />
          </div>

          {/* 右栏：实时预览 */}
          <div className="w-1/3">
            <DiagramPreview />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramGenerator;