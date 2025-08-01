import { motion } from 'framer-motion';
import { Minus } from 'lucide-react';
import React, { ReactNode, useEffect, useRef, useState } from 'react';

interface FloatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
  height?: string;
}

const FloatWindow: React.FC<FloatWindowProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  width,
  height
}) => {
  // 设置默认标题和尺寸为对话模式
  const defaultTitle = 'AI 对话助手';
  const defaultWidth = '600px';
  const defaultHeight = '700px';
  
  const windowTitle = title || defaultTitle;
  const windowWidth = width || defaultWidth;
  const windowHeight = height || defaultHeight;
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);

  // 初始化位置
  useEffect(() => {
    if (windowRef.current && isOpen) {
      const { innerWidth, innerHeight } = window;
      const parsedWidth = parseInt(windowWidth);
      const parsedHeight = parseInt(windowHeight);
      
      // 统一将浮窗显示在右下角（机器人的上方）
      const x = innerWidth - parsedWidth - 20;
      const y = innerHeight - parsedHeight - 20;
      
      setPosition({ x, y });
    }
  }, [windowWidth, windowHeight, isOpen]);

  // 处理鼠标按下事件
  const handleMouseDown = (e: React.MouseEvent) => {
    if (titleBarRef.current && titleBarRef.current.contains(e.target as Node)) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  // 添加和移除事件监听器
  useEffect(() => {
    // 处理鼠标移动事件
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
      }
    };

    // 处理鼠标释放事件
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, dragStart.x, dragStart.y]);




  return (
    <>
      {/* 背景遮罩 - 使用 CSS 控制显示/隐藏而不是销毁 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        style={{ 
          visibility: isOpen ? 'visible' : 'hidden',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      />
      
      {/* 悬浮窗 - 使用 CSS 控制显示/隐藏 */}
      <motion.div
        ref={windowRef}
        initial={{ opacity: 0, scale: 0.9, y: -20 }}
        animate={{ 
          opacity: isOpen ? 1 : 0, 
          scale: isOpen ? 1 : 0.9,
          y: isOpen ? 0 : -20
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed z-50 bg-white rounded-lg shadow-xl flex flex-col"
        style={{ 
          width: windowWidth, 
          height: windowHeight,
          left: `${position.x}px`,
          top: `${position.y}px`,
          visibility: isOpen ? 'visible' : 'hidden',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        onMouseDown={handleMouseDown}
      >
        {/* 标题栏 */}
        <div 
          ref={titleBarRef}
          className="flex items-center justify-between p-4 border-b border-gray-200 cursor-move"
          onMouseDown={handleMouseDown}
        >
          <h3 className="text-lg font-medium text-gray-900">{windowTitle}</h3>
          <div className="flex space-x-2">
            {/* 最小化按钮 */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              title="最小化"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>
        
        {/* 内容区域 - 始终保持挂载，仅控制可见性 */}
        <div className="flex-1 overflow-auto" style={{ display: isOpen ? 'block' : 'none' }}>
          {children}
        </div>
      </motion.div>
    </>
  );
};

export default FloatWindow;