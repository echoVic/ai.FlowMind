/**
 * 架构图生成器主组件
 * 使用 Zustand 状态管理，整合所有功能模块
 */
import { motion } from 'framer-motion';
import React from 'react';
import { useSidebarOpen } from '../../stores/hooks';
import AIAssistant from './AIAssistant';
import CodeEditor from './CodeEditor';
import DiagramPreview from './DiagramPreview';
import Header from './Header';
import InputPanel from './InputPanel';
import Sidebar from './Sidebar';

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

        {/* 核心工作区 - 调整布局比例，让预览区域更大 */}
        <div className="flex-1 flex bg-white overflow-auto">
          {/* 左栏：输入与生成 - 缩小到1/4 */}
          <div className="w-1/4 flex flex-col border-r border-gray-100">
            <InputPanel />
            
            {/* AI助手卡片 */}
            <div className="h-64 border-t border-gray-100">
              <AIAssistant />
            </div>
          </div>

          {/* 中栏：代码编辑 - 缩小到1/4 */}
          <div className="w-1/4 border-r border-gray-100">
            <CodeEditor />
          </div>

          {/* 右栏：实时预览 - 扩大到1/2，占用更多空间 */}
          <div className="w-1/2">
            <DiagramPreview />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagramGenerator;