/**
 * 架构图预览组件
 * 实时渲染Mermaid图表，支持缩放和导出
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAtom } from 'jotai';
import { motion } from 'framer-motion';
import { Eye, ZoomIn, ZoomOut, RotateCcw, Download, Maximize, AlertCircle } from 'lucide-react';
import mermaid from 'mermaid';
import { currentDiagramAtom, previewConfigAtom } from '../../../stores/diagramStore';
import toast from 'react-hot-toast';

const DiagramPreview: React.FC = () => {
  const [currentDiagram] = useAtom(currentDiagramAtom);
  const [previewConfig, setPreviewConfig] = useAtom(previewConfigAtom);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const initializationRef = useRef(false);

  // 初始化Mermaid - 只执行一次
  useEffect(() => {
    let mounted = true;
    
    const initMermaid = async () => {
      if (initializationRef.current) return;
      initializationRef.current = true;
      
      try {
        await mermaid.initialize({
          startOnLoad: false,
          theme: previewConfig.theme,
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 20
          },
          sequence: {
            diagramMarginX: 50,
            diagramMarginY: 10,
            actorMargin: 50,
            width: 150,
            height: 65
          },
          class: {
            titleTopMargin: 25
          },
          gitGraph: {
            mode: 'simple'
          }
        });
        
        if (mounted) {
          setIsInitialized(true);
          console.log('Mermaid初始化成功');
        }
      } catch (err) {
        console.error('Mermaid初始化失败:', err);
        if (mounted) {
          setError('图表渲染库初始化失败');
        }
      }
    };

    initMermaid();
    
    return () => {
      mounted = false;
    };
  }, []);

  // 渲染图表的核心函数
  const renderDiagram = useCallback(async () => {
    if (!isInitialized || !containerRef.current || !currentDiagram.mermaidCode.trim()) {
      return;
    }

    const currentRenderId = ++renderIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      // 清空容器
      const container = containerRef.current;
      container.innerHTML = '';

      // 创建临时div用于验证语法
      const tempId = `mermaid-temp-${currentRenderId}`;
      
      // 先验证语法
      await mermaid.parse(currentDiagram.mermaidCode);
      
      // 如果组件已卸载，停止渲染
      if (currentRenderId !== renderIdRef.current) return;

      // 渲染图表
      const { svg } = await mermaid.render(tempId, currentDiagram.mermaidCode);
      
      // 再次检查是否还是最新的渲染请求
      if (currentRenderId !== renderIdRef.current) return;

      // 创建包装器
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-wrapper';
      wrapper.style.cssText = `
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 200px;
        padding: 20px;
        transform: scale(${previewConfig.scale});
        transform-origin: center center;
        transition: transform 0.2s ease;
        overflow: visible;
      `;
      
      wrapper.innerHTML = svg;
      container.appendChild(wrapper);

      // 应用样式优化
      const svgElement = wrapper.querySelector('svg');
      if (svgElement) {
        // 获取原始尺寸
        const originalWidth = svgElement.getAttribute('width') || '800';
        const originalHeight = svgElement.getAttribute('height') || '600';
        
        // 计算合适的显示尺寸（限制最大宽度）
        const maxWidth = Math.min(800, container.clientWidth - 80); // 预留边距
        const maxHeight = Math.min(600, container.clientHeight - 80);
        
        // 计算缩放比例以适应容器
        const widthRatio = maxWidth / parseInt(originalWidth);
        const heightRatio = maxHeight / parseInt(originalHeight);
        const baseScale = Math.min(widthRatio, heightRatio, 1); // 最大不超过原始尺寸
        
        svgElement.style.cssText = `
          width: ${Math.min(parseInt(originalWidth) * baseScale, maxWidth)}px;
          height: auto;
          max-width: 100%;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          display: block;
        `;
        
        console.log('图表渲染成功，尺寸：', {
          original: { width: originalWidth, height: originalHeight },
          display: { 
            width: Math.min(parseInt(originalWidth) * baseScale, maxWidth),
            scale: baseScale 
          }
        });
      }

      console.log('图表渲染成功');
    } catch (err) {
      console.error('图表渲染失败:', err);
      
      if (currentRenderId !== renderIdRef.current) return;
      
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      setError(`语法错误：${errorMsg}`);
      
      // 显示错误信息
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 300px; 
            color: #ef4444;
            text-align: center;
            padding: 20px;
          ">
            <div style="
              width: 48px; 
              height: 48px; 
              border: 2px solid #ef4444; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              margin-bottom: 16px;
            ">
              ⚠️
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">渲染失败</h3>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">请检查 Mermaid 语法是否正确</p>
            <details style="margin-top: 12px; max-width: 400px;">
              <summary style="cursor: pointer; color: #6b7280; font-size: 12px;">查看详细错误</summary>
              <pre style="
                margin-top: 8px; 
                padding: 8px; 
                background: #f3f4f6; 
                border-radius: 4px; 
                font-size: 11px; 
                overflow: auto;
                text-align: left;
              ">${errorMsg}</pre>
            </details>
          </div>
        `;
      }
    } finally {
      if (currentRenderId === renderIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentDiagram.mermaidCode, previewConfig.scale, isInitialized]);

  // 监听初始化完成，立即进行首次渲染
  useEffect(() => {
    if (isInitialized && currentDiagram.mermaidCode.trim()) {
      // 使用 setTimeout 确保 DOM 已经准备好
      const timer = setTimeout(() => {
        renderDiagram();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized]);

  // 监听代码变化和缩放变化
  useEffect(() => {
    if (isInitialized) {
      renderDiagram();
    }
  }, [renderDiagram]);

  const handleZoomIn = () => {
    setPreviewConfig(prev => ({
      ...prev,
      scale: Math.min(prev.scale + 0.1, 2)
    }));
  };

  const handleZoomOut = () => {
    setPreviewConfig(prev => ({
      ...prev,
      scale: Math.max(prev.scale - 0.1, 0.2)
    }));
  };

  const handleResetZoom = () => {
    setPreviewConfig(prev => ({
      ...prev,
      scale: 0.7
    }));
  };

  const handleExportImage = async () => {
    const svgElement = containerRef.current?.querySelector('svg');
    if (!svgElement) {
      toast.error('没有可导出的图表');
      return;
    }

    try {
      // 克隆SVG以避免影响原图
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // 设置白色背景
      clonedSvg.style.background = 'white';
      
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentDiagram.title || 'diagram'}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('图表导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败，请重试');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <h2 className="font-medium text-gray-900">实时预览</h2>
          </div>
          
          {/* 状态指示器 */}
          {!isInitialized && (
            <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded">初始化中...</span>
          )}
          {isLoading && (
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-1 rounded">渲染中...</span>
          )}
          {error && (
            <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">渲染失败</span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleZoomOut}
            className="p-2 rounded-md bg-white hover:bg-gray-100 text-gray-600 border border-gray-200"
            title="缩小"
            disabled={!isInitialized || isLoading}
          >
            <ZoomOut size={16} />
          </motion.button>
          
          <span className="text-sm text-gray-500 min-w-[3rem] text-center px-2">
            {Math.round(previewConfig.scale * 100)}%
          </span>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleZoomIn}
            className="p-2 rounded-md bg-white hover:bg-gray-100 text-gray-600 border border-gray-200"
            title="放大"
            disabled={!isInitialized || isLoading}
          >
            <ZoomIn size={16} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleResetZoom}
            className="p-2 rounded-md bg-white hover:bg-gray-100 text-gray-600 border border-gray-200"
            title="重置缩放"
            disabled={!isInitialized || isLoading}
          >
            <RotateCcw size={16} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportImage}
            className="p-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
            title="导出SVG"
            disabled={!isInitialized || isLoading || error}
          >
            <Download size={16} />
          </motion.button>
        </div>
      </div>

      {/* 预览区域 */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 font-medium">正在渲染图表...</p>
              <p className="text-gray-400 text-sm mt-1">请稍候</p>
            </div>
          </div>
        )}
        
        {!isLoading && !isInitialized && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-600 font-medium">初始化渲染引擎...</p>
              <p className="text-gray-400 text-sm mt-1">首次加载需要一点时间</p>
            </div>
          </div>
        )}
        
        {!isLoading && isInitialized && !currentDiagram.mermaidCode.trim() && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center max-w-sm">
              <Maximize size={64} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2 text-gray-700">等待图表数据</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                在左侧输入 Mermaid 代码<br />
                或使用 AI 生成架构图
              </p>
            </div>
          </div>
        )}

        {!isLoading && isInitialized && currentDiagram.mermaidCode.trim() && !error && (
          <div className="flex items-center justify-center min-h-full p-4">
            <div 
              ref={containerRef}
              className="w-full max-w-full flex justify-center"
              style={{ 
                minHeight: '200px',
                maxWidth: '100%',
                overflow: 'hidden'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagramPreview;