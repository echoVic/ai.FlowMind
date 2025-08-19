/**
 * 架构图预览组件
 * 使用 Zustand 状态管理，实时渲染 Mermaid 图表，支持缩放和导出
 */
import { useDiagramGenerator } from '@/lib/hooks/useDiagramGenerator';
import { useAppStore } from '@/lib/stores/appStore';
import { useCurrentDiagram, usePreviewConfig } from '@/lib/stores/hooks';
import { useMemoizedFn } from 'ahooks';
import { motion } from 'framer-motion';
import { AlertTriangle, Brush, ChevronDown, Maximize, Palette, RotateCcw, Sparkles, ZoomIn, ZoomOut } from 'lucide-react';
import mermaid from 'mermaid';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

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
  const [isAiFixing, setIsAiFixing] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isLookDropdownOpen, setIsLookDropdownOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const initializationRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  const lookDropdownRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  const { optimizeDiagram } = useDiagramGenerator();

  // AI Fix 功能
  const handleAiFix = useMemoizedFn(async () => {
    if (!error || isAiFixing) return;
    
    setIsAiFixing(true);
    
    try {
      // 构建错误修复的提示 - 进一步优化版本
      const errorTypeMap = {
        'syntax': '语法错误',
        'parse': '解析错误', 
        'render': '渲染错误',
        'unknown': '未知错误'
      };
      
      const fixPrompt = `# Mermaid 图表错误修复任务

你是一位专业的 Mermaid 图表语法专家。请分析并修复以下代码中的错误。

## 🔍 错误分析
**错误类型**: ${errorTypeMap[error.type || 'unknown']}
**错误描述**: ${error.message}${error.line ? `\n**错误位置**: 第 ${error.line} 行${error.column ? `，第 ${error.column} 列` : ''}` : ''}

## 📝 待修复代码
\`\`\`mermaid
${currentDiagram.mermaidCode.trim()}
\`\`\`

## ✅ 修复标准
1. **保持语义**: 维持原图表的逻辑结构和表达意图
2. **语法正确**: 严格遵循 Mermaid 官方语法规范
3. **完整可用**: 确保输出代码可以直接渲染
4. **预防性修复**: 识别并修复其他潜在的语法问题

## 🎯 重点检查项
- [ ] 图表类型声明是否唯一且正确 (graph/flowchart/sequence等)
- [ ] 节点ID命名是否符合规范 (字母开头，无特殊字符)
- [ ] 是否使用了Mermaid保留关键字作为节点ID (如end, start, stop, class, state, note等)
- [ ] 箭头和连接语法是否正确 (-->, ---, ==>等)
- [ ] 括号、引号是否正确闭合 ([text], "label"等)
- [ ] 特殊字符是否正确转义
- [ ] 是否存在重复或冲突的语句

## 🚫 常见保留关键字 (禁止作为节点ID使用)
end, start, stop, class, state, note, loop, alt, opt, par, critical, break, rect, activate, deactivate, if, else, elseif, endif

**修复建议**: 将保留关键字改为描述性ID，如：end → endNode, start → startNode, class → classNode

## 📋 输出要求
请直接返回修复后的完整 Mermaid 代码，格式如下：
\`\`\`mermaid
[修复后的代码]
\`\`\`

不要包含任何解释说明，只返回可直接使用的代码。`;
      
      console.log('AI Fix 进一步优化的 Prompt:', fixPrompt);
      
      // 调用图表生成器进行修复
      await optimizeDiagram(fixPrompt);
      
      // 清除错误状态
      setError(null);
      
      toast.success('🤖 AI 已修复代码错误！');
      
    } catch (fixError) {
      console.error('AI Fix 失败:', fixError);
      toast.error('AI 修复失败，请手动检查代码');
    } finally {
      setIsAiFixing(false);
    }
  });
  
  // 解析错误信息
  const parseError = useMemoizedFn((error: any): MermaidError => {
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
  });

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
            setError({
              message: '图表渲染库加载失败，请刷新页面重试',
              type: 'render'
            });
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
          theme: 'default', // 使用默认主题，通过配置块控制主题
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
          
          // 初始化完成后，如果有默认图表代码，立即尝试渲染
          if (currentDiagram.mermaidCode.trim()) {
            console.log('DiagramPreview: 检测到默认图表，准备渲染');
            // 延迟一点时间确保状态更新完成
            setTimeout(() => {
              if (containerRef.current && mounted) {
                console.log('DiagramPreview: 开始渲染默认图表');
                renderDiagram();
              }
            }, 150);
          }
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
  }, [parseError]); // 移除主题依赖，只在第一次初始化

  // 渲染图表的核心函数
  const renderDiagram = useMemoizedFn(async () => {
    if (!isInitialized || !containerRef.current || !currentDiagram.mermaidCode.trim()) {
      console.log('DiagramPreview: 渲染条件不满足', {
        isInitialized,
        hasContainer: !!containerRef.current,
        hasCode: !!currentDiagram.mermaidCode.trim()
      });
      return;
    }

    const container = containerRef.current;
    
    // 检查容器是否在DOM中且可见
    if (!container.isConnected) {
      console.log('DiagramPreview: 容器未连接到DOM，延迟渲染');
      setTimeout(() => renderDiagram(), 100);
      return;
    }
    
    // 检查容器尺寸是否有效
    if (container.clientWidth === 0 || container.clientHeight === 0) {
      console.log('DiagramPreview: 容器尺寸还未准备好，延迟渲染...', {
        width: container.clientWidth,
        height: container.clientHeight,
        offsetWidth: container.offsetWidth,
        offsetHeight: container.offsetHeight
      });
      
      // 延迟重试，给容器更多时间准备
      setTimeout(() => renderDiagram(), 200);
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

      // 如果是手绘外观模式，在代码前添加配置指令
      if (previewConfig.look === 'handDrawn') {
        cleanedCode = `---
config:
  theme: ${previewConfig.theme}
  look: handDrawn
  handDrawnSeed: 42
---
${cleanedCode}`;
      } else {
        cleanedCode = `---
config:
  theme: ${previewConfig.theme}
---
${cleanedCode}`;
      }

      console.log('DiagramPreview: 使用清理后的代码进行渲染', {
        theme: previewConfig.theme,
        look: previewConfig.look
      });

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
        const containerWidth = Math.max(container.clientWidth, 400); // 最小宽度400px
        const containerHeight = Math.max(container.clientHeight, 300); // 最小高度300px
        
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
      

    } finally {
      if (currentRenderId === renderIdRef.current) {
        setIsLoading(false);
      }
    }
  });

  // 监听初始化完成和代码变化，进行渲染
  useEffect(() => {
    if (isInitialized && currentDiagram.mermaidCode.trim()) {
      console.log('触发图表渲染，代码内容：', currentDiagram.mermaidCode.substring(0, 50) + '...');
      console.log('渲染参数：', { 
        theme: previewConfig.theme, 
        look: previewConfig.look, 
        scale: previewConfig.scale 
      });
      
      // 清除之前的错误状态
      setError(null);
      
      // 增加延迟时间确保容器完全准备好
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
  }, [isInitialized, currentDiagram.mermaidCode, previewConfig.scale, previewConfig.theme, previewConfig.look, renderDiagram]);

  // 确保默认图表在初始化后能够显示
  useEffect(() => {
    if (isInitialized && currentDiagram.mermaidCode.trim() && !error && containerRef.current) {
      // 额外的渲染触发，确保默认图表能够显示
      const timer = setTimeout(() => {
        renderDiagram();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized, containerRef.current]);

  // 强制渲染机制 - 处理初始化时偶现不渲染的问题
  useEffect(() => {
    if (isInitialized && currentDiagram.mermaidCode.trim() && containerRef.current) {
      // 检查容器是否为空，如果为空则强制渲染
      const checkAndRender = () => {
        const container = containerRef.current;
        if (container && container.children.length === 0 && !isLoading && !error) {
          console.log('DiagramPreview: 检测到空容器，强制渲染默认图表');
          renderDiagram();
        }
      };
      
      // 延迟检查，给其他渲染逻辑足够时间
      const timer = setTimeout(checkAndRender, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isInitialized, currentDiagram.mermaidCode, isLoading, error]);

  // 组件挂载状态管理
  useEffect(() => {
    mountedRef.current = true;
    
    // 组件挂载后的额外检查
    const mountCheck = () => {
      if (mountedRef.current && isInitialized && currentDiagram.mermaidCode.trim() && containerRef.current) {
        const container = containerRef.current;
        if (container.children.length === 0 && !isLoading && !error) {
          console.log('DiagramPreview: 组件挂载后检查，容器为空，触发渲染');
          renderDiagram();
        }
      }
    };
    
    // 延迟执行挂载检查
    const timer = setTimeout(mountCheck, 300);
    
    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
    };
  }, []);
 
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



  const handleThemeChange = (theme: 'default' | 'base' | 'dark' | 'forest' | 'neutral' | 'null') => {
    setPreviewConfig({
      ...previewConfig,
      theme: theme
    });
    
    setIsThemeDropdownOpen(false);
    toast.success(`已切换到${theme}主题`);
  };

  const handleLookChange = (look: 'default' | 'handDrawn') => {
    setPreviewConfig({
      ...previewConfig,
      look: look
    });
    
    setIsLookDropdownOpen(false);
    toast.success(`已切换到${look === 'handDrawn' ? '手绘' : '默认'}外观`);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
        setIsThemeDropdownOpen(false);
      }
      if (lookDropdownRef.current && !lookDropdownRef.current.contains(event.target as Node)) {
        setIsLookDropdownOpen(false);
      }

    };

    if (isThemeDropdownOpen || isLookDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeDropdownOpen, isLookDropdownOpen]);

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
          {isInitialized && !isLoading && (
            <div className="flex items-center space-x-2">
              <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600">
                {previewConfig.theme}主题
              </span>
              {previewConfig.look === 'handDrawn' && (
                <span className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-600">
                  手绘外观
                </span>
              )}
            </div>
          )}
          
        </div>
        
        <div className="flex items-center space-x-1">
          {/* 主题选择下拉框 */}
          <div ref={themeDropdownRef} className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 border border-gray-200 transition-colors bg-white text-gray-600"
              title="选择主题"
              disabled={!isInitialized || isLoading}
            >
              <Palette size={16} />
              <span className="text-sm">{previewConfig.theme}</span>
              <ChevronDown size={14} className={`transition-transform ${isThemeDropdownOpen ? 'rotate-180' : ''}`} />
            </motion.button>
            
            {/* 主题下拉菜单 */}
            {isThemeDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
                className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]"
              >
                {(['default', 'base', 'dark', 'forest', 'neutral', 'null'] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleThemeChange(theme)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                      previewConfig.theme === theme ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <Palette size={12} />
                    <span>{theme}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* 外观选择下拉框 */}
          <div ref={lookDropdownRef} className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsLookDropdownOpen(!isLookDropdownOpen)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 border border-gray-200 transition-colors ${
                previewConfig.look === 'handDrawn' 
                  ? 'bg-purple-50 text-purple-600 border-purple-200' 
                  : 'bg-white text-gray-600'
              }`}
              title="选择外观"
              disabled={!isInitialized || isLoading}
            >
              <Brush size={16} />
              <span className="text-sm">{previewConfig.look === 'handDrawn' ? '手绘' : '默认'}</span>
              <ChevronDown size={14} className={`transition-transform ${isLookDropdownOpen ? 'rotate-180' : ''}`} />
            </motion.button>
            
            {/* 外观下拉菜单 */}
            {isLookDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.1 }}
                className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[120px]"
              >
                <button
                  onClick={() => handleLookChange('default')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                    previewConfig.look === 'default' ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  }`}
                >
                  <div className="w-3 h-3 border border-gray-300 rounded bg-white"></div>
                  <span>默认外观</span>
                </button>
                <button
                  onClick={() => handleLookChange('handDrawn')}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center space-x-2 ${
                    previewConfig.look === 'handDrawn' ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                  }`}
                >
                  <Brush size={12} />
                  <span>手绘外观</span>
                </button>
              </motion.div>
            )}
          </div>
          
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

        {!isLoading && isInitialized && currentDiagram.mermaidCode.trim() && error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-lg mx-auto p-8">
              <div className="w-16 h-16 border-3 border-red-500 border-solid rounded-full flex items-center justify-center mx-auto mb-6 bg-white">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-red-600">
                {error.type === 'syntax' ? '语法错误' : 
                 error.type === 'parse' ? '解析错误' : 
                 error.type === 'render' ? '渲染错误' : '错误'}
              </h3>
              {error.line && (
                <p className="text-sm text-red-500 font-medium mb-4">
                  第 {error.line} 行{error.column && `，第 ${error.column} 列`}
                </p>
              )}
              <p className="text-gray-600 mb-6 leading-relaxed">
                请检查 Mermaid 语法是否正确
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                    🔍 查看错误详情
                  </summary>
                  <div className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-100 font-mono overflow-auto">
                    <div className="text-red-400 font-semibold mb-1">
                      错误类型：{error.type === 'syntax' ? '语法错误' : 
                               error.type === 'parse' ? '解析错误' : 
                               error.type === 'render' ? '渲染错误' : '未知错误'}
                    </div>
                    {error.line && (
                      <div className="text-blue-400 mb-2">
                        位置：第 {error.line} 行{error.column && `，第 ${error.column} 列`}
                      </div>
                    )}
                    <div className="text-gray-300">错误信息：</div>
                    <div className="text-yellow-300 whitespace-pre-wrap break-words mt-1">
                      {error.message}
                    </div>
                  </div>
                </details>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAiFix}
                disabled={isAiFixing}
                className={`
                  relative px-6 py-3 rounded-xl font-medium text-sm transition-all duration-300 
                  ${isAiFixing 
                    ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl'
                  }
                `}
              >
                {/* 背景光效 */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
                
                {/* 按钮内容 */}
                <div className="relative flex items-center space-x-2">
                  {isAiFixing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>AI 修复中...</span>
                    </>
                  ) : (
                    <>
                      <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          ease: "linear" 
                        }}
                      >
                        <Sparkles size={16} className="text-white" />
                      </motion.div>
                      <span>AI Fix</span>
                      <div className="text-xs opacity-75">✨</div>
                    </>
                  )}
                </div>
                
                {/* 闪烁效果 */}
                {!isAiFixing && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.1, 0] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
              </motion.button>
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