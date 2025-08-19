'use client';

/**
 * AI Native 工作空间主组件
 * 以 AI 对话为中心的全新布局设计
 */

import { useModelManager } from '@/lib/hooks/useModelManager';
import { useCurrentDiagram } from '@/lib/stores/hooks';
import React, { useEffect, useState } from 'react';
import AIHeader from './AIHeader';
import ConversationalWorkspace from './ConversationalWorkspace';
import ToolsPanel from './ToolsPanel';

const AIWorkspace: React.FC = () => {
  const [activeToolTab, setActiveToolTab] = useState<'preview' | 'code' | 'export' | 'settings'>('preview');
  const currentDiagram = useCurrentDiagram();
  
  // 初始化模型管理器
  const { loadModels } = useModelManager();
  
  // 组件挂载时加载模型
  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // 监听图表变化，自动切换到预览标签
  useEffect(() => {
    if (currentDiagram.mermaidCode.trim()) {
      console.log('检测到图表生成，切换到预览标签');
      setActiveToolTab('preview');
    }
  }, [currentDiagram.mermaidCode]);

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50">
      {/* 左侧：AI 对话界面 - 40% */}
      <div className="w-2/5 flex flex-col min-w-0">
        {/* AI 助手头部 */}
        <AIHeader />
        
        {/* 核心对话区 - 占据主要空间 */}
        <div className="flex-1 flex overflow-hidden min-w-[300px]">
          <ConversationalWorkspace />
        </div>
      </div>
      
      {/* 右侧：工具面板 - 60% */}
      <div className="w-3/5 bg-white/90 backdrop-blur-sm border-l border-gray-200 shadow-xl overflow-hidden">
        <ToolsPanel
          activeTab={activeToolTab}
          onTabChange={setActiveToolTab}
          className="h-full"
        />
      </div>
      

      

    </div>
  );
};

export default AIWorkspace;