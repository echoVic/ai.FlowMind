/**
 * 架构图预览组件
 * 使用 Zustand 状态管理，实时渲染 Mermaid 图表，支持缩放和导出
 */
import { motion } from 'framer-motion';
import { AlertTriangle, Download, Maximize, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import mermaid from 'mermaid';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from '../../../stores/appStore';
import { useCurrentDiagram, usePreviewConfig } from '../../../stores/hooks';

// 错误信息接口
interface MermaidError {
  message: string;
  line?: number;
  column?: number;
  type?: 'syntax' | 'parse' | 'render' | 'unknown';
}

const DiagramPreview: React.FC = () => {
  const currentDiagram = useCurrentDiagram();
  const previewConfig = usePreviewConfig();
  const setPreviewConfig = useAppStore(state => state.setPreviewConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MermaidError | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const initializationRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // 解析错误信息
  const parseError = useCallback((error: any): MermaidError => {
    const errorMessage = error?.str || error?.message || error?.toString() || '未知错误';
    
    // 尝试从错误信息中提取行号
    const lineMatch = /Parse error on line (\d+)/.exec(errorMessage);
    const positionMatch = /(\d+):(\d+)/.exec(errorMessage);
    
    let line: number | undefined;
    let column: number | undefined;
    let type: MermaidError['type'] = 'unknown';
    
    if (lineMatch) {
      line = parseInt(lineMatch[1], 10);
      type = 'parse';
    } else if (positionMatch) {
      line = parseInt(positionMatch[1], 10);
      column = parseInt(positionMatch[2], 10);
      type = 'syntax';
    }
    
    // 根据错误信息判断类型
    if (errorMessage.includes('Parse error')) {
      type = 'parse';
    } else if (errorMessage.includes('Syntax error')) {
      type = 'syntax';
    } else if (errorMessage.includes('render')) {
      type = 'render';
    }
    
    return {
      message: errorMessage,
      line,
      column,
      type
    };
  }, []);

  // 初始化Mermaid - 只执行一次
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const initMermaid = async () => {
      if (initializationRef.current) return;
      
      // 检查 mermaid 是否已加载
      if (typeof mermaid === 'undefined') {
        console.warn('Mermaid库未加载，等待重试...');
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(() => initMermaid(), 1000);
          return;
        } else {
          console.error('Mermaid库加载失败，已达到最大重试次数');
          if (mounted) {
            setError('图表渲染库加载失败，请刷新页面重试');
          }
          return;
        }
      }
      
      initializationRef.current = true;
      
      try {
        console.log('开始初始化Mermaid...');
        
        // 重置 mermaid 状态
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
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
          // 添加错误处理配置
          logLevel: 'error',
          deterministicIds: false
        });
        
        // 测试 mermaid 是否可以正常工作
        await mermaid.parse('graph TD\n  A --> B');
        
        if (mounted) {
          setIsInitialized(true);
          console.log('Mermaid初始化成功');
        }
      } catch (err) {
        console.error('Mermaid初始化失败:', err);
        if (mounted) {
          const parsedError = parseError(err);
          setError(parsedError);
          setIsInitialized(false);
        }
        // 重置初始化标志，允许重试
        initializationRef.current = false;
      }
    };

    // 延迟初始化，确保 mermaid 库已经加载
    const timer = setTimeout(() => {
      initMermaid();
    }, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [parseError]); // 添加 parseError 依赖

  // 渲染图表的核心函数
  const renderDiagram = useCallback(async () => {
    if (!isInitialized || !containerRef.current || !currentDiagram.mermaidCode.trim()) {
      return;
    }

    const container = containerRef.current;
    
    // 检查容器尺寸是否有效，如果没有则等待一下再重试
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      console.log('容器尺寸还未准备好，等待重试...', {
        width: container.clientWidth,
        height: container.clientHeight
      });
      
      // 延迟重试
      setTimeout(() => {
        renderDiagram();
      }, 100);
      return;
    }

    const currentRenderId = ++renderIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      // 清空容器
      container.innerHTML = '';

      // 清理 mermaidCode，移除可能的代码块标记（额外保护）
      let cleanedCode = currentDiagram.mermaidCode;
      cleanedCode = cleanedCode
        .replace(/^```mermaid\s*\n?/i, '')  // 移除开头的 ```mermaid
        .replace(/^```\s*\n?/i, '')        // 移除开头的 ```
        .replace(/\n?```\s*$/i, '')        // 移除结尾的 ```
        .trim();                           // 移除前后空白

      console.log('DiagramPreview: 使用清理后的代码进行渲染');

      // 创建临时div用于验证语法
      const tempId = `mermaid-temp-${currentRenderId}`;
      
      // 先验证语法
      await mermaid.parse(cleanedCode);
      
      // 如果组件已卸载，停止渲染
      if (currentRenderId !== renderIdRef.current) return;

      // 渲染图表
      const { svg } = await mermaid.render(tempId, cleanedCode);
      
      // 再次检查是否还是最新的渲染请求
      if (currentRenderId !== renderIdRef.current) return;

      // 创建包装器
      const wrapper = document.createElement('div');
      wrapper.className = 'mermaid-wrapper';
      wrapper.style.cssText = `
        width: 100%;
        height: 100%;
        padding: 5px;
        transform: scale(${previewConfig.scale});
        transform-origin: center center;
        transition: transform 0.2s ease;
        overflow: visible;
        box-sizing: border-box;
      `;
      
      wrapper.innerHTML = svg;
      container.appendChild(wrapper);

      // 应用样式优化
      const svgElement = wrapper.querySelector('svg');
      if (svgElement) {
        // 获取原始尺寸
        const originalWidth = svgElement.getAttribute('width') || '800';
        const originalHeight = svgElement.getAttribute('height') || '600';
        
        // 让SVG充满整个可用空间
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 设置SVG样式让它充满容器
        svgElement.style.cssText = `
          width: 100%;
          height: 100%;
          max-width: none;
          max-height: none;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          display: block;
          object-fit: contain;
        `;
        
        // 设置SVG的viewBox属性以保持比例
        const viewBox = svgElement.getAttribute('viewBox') || `0 0 ${originalWidth} ${originalHeight}`;
        svgElement.setAttribute('viewBox', viewBox);
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        
        console.log('图表渲染成功，尺寸：', {
          original: { width: originalWidth, height: originalHeight },
          container: { 
            width: containerWidth,
            height: containerHeight
          },
          display: '100% (充满容器)'
        });
      }

      console.log('图表渲染成功，SVG元素已添加到容器');
    } catch (err) {
      console.error('图表渲染失败:', err);
      
      if (currentRenderId !== renderIdRef.current) return;
      
      const parsedError = parseError(err);
      setError(parsedError);
      
      // 显示错误信息
      if (containerRef.current) {
        const errorTypeIcons = {
          'syntax': '🔍',
          'parse': '📝',
          'render': '🎨',
          'unknown': '⚠️'
        };
        
        const errorTypeNames = {
          'syntax': '语法错误',
          'parse': '解析错误',
          'render': '渲染错误',
          'unknown': '未知错误'
        };
        
        const icon = errorTypeIcons[parsedError.type || 'unknown'];
        const typeName = errorTypeNames[parsedError.type || 'unknown'];
        
        let locationInfo = '';
        if (parsedError.line) {
          locationInfo = `第 ${parsedError.line} 行`;
          if (parsedError.column) {
            locationInfo += `，第 ${parsedError.column} 列`;
          }
        }
        
        containerRef.current.innerHTML = `
          <div style="
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            height: 100%; 
            min-height: 300px;
            color: #ef4444;
            text-align: center;
            padding: 20px;
            background: #fef2f2;
            border-radius: 8px;
            margin: 20px;
          ">
            <div style="
              width: 64px; 
              height: 64px; 
              border: 3px solid #ef4444; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              margin-bottom: 20px;
              font-size: 24px;
              background: white;
            ">
              ${icon}
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #dc2626;">${typeName}</h3>
            ${locationInfo ? `<p style="margin: 0 0 12px 0; color: #7f1d1d; font-size: 14px; font-weight: 500;">${locationInfo}</p>` : ''}
            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; max-width: 400px; line-height: 1.5;">
              请检查 Mermaid 语法是否正确
            </p>
            <details style="margin-top: 12px; max-width: 500px; text-align: left;">
              <summary style="
                cursor: pointer; 
                color: #374151; 
                font-size: 14px; 
                font-weight: 500;
                padding: 8px 12px;
                background: #f3f4f6;
                border-radius: 6px;
                margin-bottom: 8px;
              ">🔍 查看错误详情</summary>
              <div style="
                margin-top: 8px; 
                padding: 12px; 
                background: #1f2937; 
                border-radius: 6px; 
                font-size: 12px; 
                overflow: auto;
                color: #f3f4f6;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                line-height: 1.4;
                border: 1px solid #374151;
              ">
                <div style="color: #f87171; font-weight: 600; margin-bottom: 4px;">错误类型：${typeName}</div>
                ${locationInfo ? `<div style="color: #60a5fa; margin-bottom: 8px;">位置：${locationInfo}</div>` : ''}
                <div style="color: #d1d5db;">消息：</div>
                <div style="color: #fde047; word-break: break-word; white-space: pre-wrap; margin-top: 4px;">${parsedError.message}</div>
              </div>
            </details>
          </div>
        `;
      }
    } finally {
      if (currentRenderId === renderIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentDiagram.mermaidCode, previewConfig.scale, isInitialized, parseError]); // 添加所有依赖

  // 监听初始化完成和代码变化，进行渲染
  useEffect(() => {
    if (isInitialized && currentDiagram.mermaidCode.trim()) {
      console.log('触发图表渲染，代码内容：', currentDiagram.mermaidCode.substring(0, 50) + '...');
      
      // 清除之前的错误状态
      setError(null);
      
      // 增加延时，确保容器布局完成
      const timer = setTimeout(() => {
        renderDiagram();
      }, 50);
      
      return () => clearTimeout(timer);
    } else {
      console.log('渲染条件不满足：', { 
        isInitialized, 
        hasCode: !!currentDiagram.mermaidCode.trim(),
        codeLength: currentDiagram.mermaidCode.length 
      });
      
      // 如果有代码但还没初始化，显示等待状态
      if (!isInitialized && currentDiagram.mermaidCode.trim()) {
        console.log('等待Mermaid初始化完成...');
      }
    }
  }, [isInitialized, currentDiagram.mermaidCode, previewConfig.scale, renderDiagram]);

  // 监听容器尺寸变化，确保在布局变化时重新渲染
  useEffect(() => {
    if (!containerRef.current || !isInitialized) return;

    const container = containerRef.current;
    
    // 创建ResizeObserver监听容器尺寸变化
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container && currentDiagram.mermaidCode.trim()) {
          console.log('容器尺寸发生变化，重新渲染图表');
          // 延迟一下确保尺寸更新完成
          setTimeout(() => {
            renderDiagram();
          }, 100);
          break;
        }
      }
    });

    resizeObserverRef.current.observe(container);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [isInitialized, currentDiagram.mermaidCode, renderDiagram]);

  const handleZoomIn = () => {
    setPreviewConfig({
      ...previewConfig,
      scale: Math.min(previewConfig.scale + 0.1, 2)
    });
  };

  const handleZoomOut = () => {
    setPreviewConfig({
      ...previewConfig,
      scale: Math.max(previewConfig.scale - 0.1, 0.2)
    });
  };

  const handleResetZoom = () => {
    setPreviewConfig({
      ...previewConfig,
      scale: 1
    });
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
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">
                  {error.type === 'syntax' ? '语法错误' : 
                   error.type === 'parse' ? '解析错误' : 
                   error.type === 'render' ? '渲染错误' : '错误'}
                  {error.line && ` (第${error.line}行)`}
                </span>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  console.log('手动重试渲染');
                  setError(null);
                  renderDiagram();
                }}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                重试
              </motion.button>
            </div>
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
            disabled={!isInitialized || isLoading || !!error}
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
          <div className="w-full h-full">
            <div 
              ref={containerRef}
              className="w-full h-full"
              style={{ 
                minHeight: '100%',
                maxWidth: '100%',
                overflow: 'auto'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagramPreview;