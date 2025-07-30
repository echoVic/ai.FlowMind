/**
 * 头部组件
 * 使用 Zustand 状态管理，包含标题、工具栏按钮和状态指示器
 */
import { useDiagramGenerator } from '@/lib/hooks/useDiagramGenerator';
import { useDiagramHistory } from '@/lib/hooks/useDiagramHistory';
import { useCurrentDiagram, useSidebarOpen, useUIActions } from '@/lib/stores/hooks';
import { motion } from 'framer-motion';
import { ChevronDown, Download, Menu, RotateCcw, Save, Share2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import SaveModal from '../modals/SaveModal';


const Header: React.FC = () => {
  const sidebarOpen = useSidebarOpen();
  const currentDiagram = useCurrentDiagram();
  const { toggleSidebar } = useUIActions();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  
  const { isSaving } = useDiagramHistory();
  const { resetDiagram } = useDiagramGenerator();

  const handleExport = (format: 'mmd' | 'svg' | 'png' | 'jpg') => {
    if (!currentDiagram.mermaidCode) {
      toast.error('请先生成架构图');
      return;
    }

    const filename = `${currentDiagram.title || '架构图'}`;

    switch (format) {
      case 'mmd':
        // 导出 Mermaid 代码
        const mmdBlob = new Blob([currentDiagram.mermaidCode], { type: 'text/plain' });
        const mmdUrl = URL.createObjectURL(mmdBlob);
        const mmdLink = document.createElement('a');
        mmdLink.href = mmdUrl;
        mmdLink.download = `${filename}.mmd`;
        document.body.appendChild(mmdLink);
        mmdLink.click();
        document.body.removeChild(mmdLink);
        URL.revokeObjectURL(mmdUrl);
        toast.success('Mermaid 代码导出成功！');
        break;

      case 'svg':
        // 导出 SVG 格式
        exportAsSVG(filename);
        break;

      case 'png':
        // 导出 PNG 格式
        exportAsImage(filename, 'png');
        break;

      case 'jpg':
        // 导出 JPG 格式
        exportAsImage(filename, 'jpeg');
        break;
    }

    setIsExportDropdownOpen(false);
  };

  const exportAsSVG = (filename: string) => {
    try {
      // 创建临时容器用于渲染SVG
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // 使用mermaid渲染SVG
      import('mermaid').then(async ({ default: mermaid }) => {
        try {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}`, currentDiagram.mermaidCode);
          
          const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
          const svgUrl = URL.createObjectURL(svgBlob);
          const link = document.createElement('a');
          link.href = svgUrl;
          link.download = `${filename}.svg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(svgUrl);
          
          document.body.removeChild(tempContainer);
          toast.success('SVG 导出成功！');
        } catch (error) {
          document.body.removeChild(tempContainer);
          toast.error('SVG 导出失败，请检查图表代码');
        }
      });
    } catch (error) {
      toast.error('SVG 导出失败');
    }
  };

  const exportAsImage = (filename: string, format: 'png' | 'jpeg') => {
    try {
      // 创建临时容器用于渲染
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.padding = '20px';
      document.body.appendChild(tempContainer);

      // 使用mermaid渲染SVG，然后转换为图片
      import('mermaid').then(async ({ default: mermaid }) => {
        try {
          const { svg } = await mermaid.render(`mermaid-${Date.now()}`, currentDiagram.mermaidCode);
          tempContainer.innerHTML = svg;

          // 等待SVG加载完成
          setTimeout(() => {
            const svgElement = tempContainer.querySelector('svg');
            if (!svgElement) {
              document.body.removeChild(tempContainer);
              toast.error('图表渲染失败');
              return;
            }

            // 创建canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              document.body.removeChild(tempContainer);
              toast.error('无法创建画布');
              return;
            }

            // 设置canvas尺寸
            const bbox = svgElement.getBoundingClientRect();
            canvas.width = bbox.width || 800;
            canvas.height = bbox.height || 600;

            // 创建图片
            const img = new Image();
            img.onload = () => {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);

              // 导出为图片
              canvas.toBlob((blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `${filename}.${format}`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  
                  document.body.removeChild(tempContainer);
                  toast.success(`${format.toUpperCase()} 导出成功！`);
                }
              }, `image/${format}`, 1.0);
            };

            img.onerror = () => {
              document.body.removeChild(tempContainer);
              toast.error('图表转换失败');
            };

            // 使用encodeURIComponent处理Unicode字符，然后转换为base64
            const encodedSvg = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodedSvg;
          }, 100);
        } catch (error) {
          document.body.removeChild(tempContainer);
          toast.error('图表渲染失败');
        }
      });
    } catch (error) {
      toast.error('图片导出失败');
    }
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

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };

    if (isExportDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportDropdownOpen]);

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

            <div ref={exportDropdownRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600"
              >
                <Download size={16} />
                <span>导出</span>
                <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
              </motion.button>
              
              {/* 导出格式下拉菜单 */}
              {isExportDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.1 }}
                  className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]"
                >
                  {[
                    { format: 'mmd', label: 'Mermaid代码', color: 'text-blue-600' },
                    { format: 'svg', label: 'SVG图片', color: 'text-green-600' },
                    { format: 'png', label: 'PNG图片', color: 'text-purple-600' },
                    { format: 'jpg', label: 'JPG图片', color: 'text-orange-600' }
                  ].map(({ format, label, color }) => (
                    <button
                      key={format}
                      onClick={() => handleExport(format as 'mmd' | 'svg' | 'png' | 'jpg')}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center space-x-2 text-gray-700`}
                    >
                      <Download size={12} className={color} />
                      <span>{label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

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
