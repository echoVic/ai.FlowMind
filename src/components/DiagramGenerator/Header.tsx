/**
 * 头部组件
 * 使用 Zustand 状态管理，包含标题、工具栏按钮和状态指示器
 */
import { motion } from 'framer-motion';
import { Download, Menu, RotateCcw, Save, Share2 } from 'lucide-react';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useDiagramGenerator } from '../../hooks/useDiagramGenerator';
import { useDiagramHistory } from '../../hooks/useDiagramHistory';
import { useCurrentDiagram, useSidebarOpen } from '../../stores/hooks';
import { useUIActions } from '../../stores/hooks';
import SaveModal from './Header/SaveModal';

const Header: React.FC = () => {
  const sidebarOpen = useSidebarOpen();
  const currentDiagram = useCurrentDiagram();
  const { toggleSidebar } = useUIActions();
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  const { isSaving } = useDiagramHistory();
  const { resetDiagram } = useDiagramGenerator();

  const handleExport = () => {
    if (!currentDiagram.mermaidCode) {
      toast.error('请先生成架构图');
      return;
    }

    // 创建下载链接
    const blob = new Blob([currentDiagram.mermaidCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDiagram.title || '架构图'}.mmd`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('代码导出成功！');
  };

  const handleShare = async () => {
    if (!currentDiagram.mermaidCode) {
      toast.error('请先生成架构图');
      return;
    }

    try {
      await navigator.clipboard.writeText(currentDiagram.mermaidCode);
      toast.success('代码已复制到剪贴板！');
    } catch (error) {
      toast.error('复制失败，请手动复制');
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 左侧：菜单和标题 */}
          <div className="flex items-center space-x-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleSidebar()}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <Menu size={20} />
            </motion.button>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                AI架构图生成器
              </h1>
              <p className="text-sm text-gray-500">
                智能化架构设计与可视化工具
              </p>
            </div>
          </div>

          {/* 右侧：工具栏 */}
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetDiagram}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <RotateCcw size={16} />
              <span>重置</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <Download size={16} />
              <span>导出</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleShare}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
            >
              <Share2 size={16} />
              <span>分享</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSaveModal(true)}
              disabled={isSaving}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span>{isSaving ? '保存中...' : '保存'}</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* 保存模态框 */}
      {showSaveModal && (
        <SaveModal onClose={() => setShowSaveModal(false)} />
      )}
    </>
  );
};

export default Header;
