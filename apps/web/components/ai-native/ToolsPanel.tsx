/**
 * 工具面板组件
 * 重新设计为辅助角色，提供代码编辑、预览等工具功能
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, 
  Eye, 
  Download, 
  Copy, 
  Maximize2, 
  Minimize2,
  Settings,
  FileText,
  Layers
} from 'lucide-react';
import CodeEditor from '../diagram/CodeEditor';
import DiagramPreview from '../diagram/DiagramPreview';
import { useCurrentDiagram } from '@/lib/stores/hooks';

interface ToolsPanelProps {
  className?: string;
  activeTab?: ToolTab;
  onTabChange?: (tab: ToolTab) => void;
}

type ToolTab = 'code' | 'preview' | 'export' | 'settings';

const ToolsPanel: React.FC<ToolsPanelProps> = ({ 
  className = '',
  activeTab: externalActiveTab,
  onTabChange
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<ToolTab>('code');
  const activeTab = externalActiveTab || internalActiveTab;
  
  const handleTabChange = (tab: ToolTab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  const [isMaximized, setIsMaximized] = useState(false);
  const currentDiagram = useCurrentDiagram();

  const tabs = [
    {
      id: 'code' as ToolTab,
      label: '代码编辑',
      icon: Code,
      description: '编辑 Mermaid 代码'
    },
    {
      id: 'preview' as ToolTab,
      label: '图表预览',
      icon: Eye,
      description: '预览生成的图表'
    },
    {
      id: 'export' as ToolTab,
      label: '导出工具',
      icon: Download,
      description: '导出图表和代码'
    },
    {
      id: 'settings' as ToolTab,
      label: '工具设置',
      icon: Settings,
      description: '配置编辑器和预览'
    }
  ];

  const handleCopyCode = () => {
    if (currentDiagram?.mermaidCode) {
      navigator.clipboard.writeText(currentDiagram.mermaidCode);
    }
  };

  const handleExportSVG = () => {
    // 导出 SVG 逻辑
    console.log('导出 SVG');
  };

  const handleExportPNG = () => {
    // 导出 PNG 逻辑
    console.log('导出 PNG');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'code':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">Mermaid 代码编辑器</h3>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCopyCode}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="复制代码"
                >
                  <Copy className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeEditor />
            </div>
          </div>
        );
        
      case 'preview':
        return (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">图表预览</h3>
              <div className="flex items-center space-x-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title={isMaximized ? "还原" : "最大化"}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <DiagramPreview />
            </div>
          </div>
        );
        
      case 'export':
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">导出选项</h3>
            </div>
            <div className="flex-1 p-4 space-y-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>代码导出</span>
                </h4>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyCode}
                  className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">复制 Mermaid 代码</span>
                    <Copy className="w-4 h-4 text-gray-500" />
                  </div>
                </motion.button>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                  <Layers className="w-4 h-4" />
                  <span>图片导出</span>
                </h4>
                <div className="space-y-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportSVG}
                    className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-blue-700">导出为 SVG</span>
                      <Download className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">矢量格式，可无限缩放</p>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportPNG}
                    className="w-full p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-700">导出为 PNG</span>
                      <Download className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xs text-green-600 mt-1">位图格式，适合分享</p>
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'settings':
        return (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-800">工具设置</h3>
            </div>
            <div className="flex-1 p-4 space-y-4">
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">编辑器设置</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm text-gray-600">显示行号</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm text-gray-600">语法高亮</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-600">自动换行</span>
                  </label>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-700">预览设置</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" defaultChecked />
                    <span className="text-sm text-gray-600">实时预览</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm text-gray-600">自动居中</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className={`h-full flex flex-col bg-white ${className}`}>
      {/* 工具面板头部 */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">开发工具</h2>
          <div className="text-sm text-gray-500">辅助功能</div>
        </div>
        
        {/* 标签页导航 */}
        <div className="flex space-x-1 bg-white rounded-lg p-1 border border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                title={tab.description}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
      
      {/* 工具面板内容 */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ToolsPanel;