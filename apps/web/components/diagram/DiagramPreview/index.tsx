/**
 * 架构图预览组件
 * 纯渲染组件，只负责 Mermaid 图表渲染。工具栏和缩放控制由外层提供。
 */
import { useDiagramGenerator } from '@/lib/hooks/useDiagramGenerator';
import { useCurrentDiagram, usePreviewConfig } from '@/lib/stores/hooks';
import { useMemoizedFn } from 'ahooks';
import { AlertTriangle, Sparkles } from 'lucide-react';
import mermaid from 'mermaid';
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface MermaidError {
  message: string;
  line?: number;
  column?: number;
  type?: 'syntax' | 'parse' | 'render' | 'unknown';
}

const DiagramPreview: React.FC = () => {
  const currentDiagram = useCurrentDiagram();
  const previewConfig = usePreviewConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MermaidError | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAiFixing, setIsAiFixing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);
  const initializationRef = useRef(false);

  const { optimizeDiagram } = useDiagramGenerator();

  // AI Fix
  const handleAiFix = useMemoizedFn(async () => {
    if (!error || isAiFixing) return;
    setIsAiFixing(true);
    try {
      const errorTypeMap = {
        'syntax': '语法错误',
        'parse': '解析错误',
        'render': '渲染错误',
        'unknown': '未知错误'
      };
      const fixPrompt = `# Mermaid 图表错误修复任务\n\n**错误类型**: ${errorTypeMap[error.type || 'unknown']}\n**错误描述**: ${error.message}${error.line ? `\n**错误位置**: 第 ${error.line} 行` : ''}\n\n## 待修复代码\n\`\`\`mermaid\n${currentDiagram.mermaidCode.trim()}\n\`\`\`\n\n请直接返回修复后的完整 Mermaid 代码。`;
      await optimizeDiagram(fixPrompt);
      setError(null);
      toast.success('AI 已修复代码错误');
    } catch {
      toast.error('AI 修复失败，请手动检查代码');
    } finally {
      setIsAiFixing(false);
    }
  });

  const parseError = useMemoizedFn((error: any): MermaidError => {
    const errorMessage = error?.str || error?.message || error?.toString() || '未知错误';
    const lineMatch = /Parse error on line (\d+)/.exec(errorMessage);
    const positionMatch = /(\d+):(\d+)/.exec(errorMessage);
    let line: number | undefined;
    let column: number | undefined;
    let type: MermaidError['type'] = 'unknown';
    if (lineMatch) { line = parseInt(lineMatch[1], 10); type = 'parse'; }
    else if (positionMatch) { line = parseInt(positionMatch[1], 10); column = parseInt(positionMatch[2], 10); type = 'syntax'; }
    if (errorMessage.includes('Parse error')) type = 'parse';
    else if (errorMessage.includes('Syntax error')) type = 'syntax';
    else if (errorMessage.includes('render')) type = 'render';
    return { message: errorMessage, line, column, type };
  });

  // 初始化 Mermaid
  useEffect(() => {
    let mounted = true;
    const initMermaid = async () => {
      if (initializationRef.current) return;
      if (typeof mermaid === 'undefined') return;
      initializationRef.current = true;
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          flowchart: { htmlLabels: true, curve: 'basis', padding: 20 },
          logLevel: 'error',
          deterministicIds: false
        });
        await mermaid.parse('graph TD\n  A --> B');
        if (mounted) setIsInitialized(true);
      } catch (err) {
        console.error('Mermaid初始化失败:', err);
        if (mounted) { setError(parseError(err)); setIsInitialized(false); }
        initializationRef.current = false;
      }
    };
    const timer = setTimeout(initMermaid, 100);
    return () => { mounted = false; clearTimeout(timer); };
  }, [parseError]);

  // 渲染图表
  const renderDiagram = useMemoizedFn(async () => {
    if (!isInitialized || !containerRef.current || !currentDiagram.mermaidCode.trim()) return;
    const container = containerRef.current;
    if (!container.isConnected || container.clientWidth === 0) {
      setTimeout(() => renderDiagram(), 200);
      return;
    }

    const currentRenderId = ++renderIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      container.innerHTML = '';
      let cleanedCode = currentDiagram.mermaidCode
        .replace(/^```mermaid\s*\n?/i, '')
        .replace(/^```\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

      // 添加配置
      if (previewConfig.look === 'handDrawn') {
        cleanedCode = `---\nconfig:\n  theme: ${previewConfig.theme}\n  look: handDrawn\n  handDrawnSeed: 42\n---\n${cleanedCode}`;
      } else {
        cleanedCode = `---\nconfig:\n  theme: ${previewConfig.theme}\n---\n${cleanedCode}`;
      }

      await mermaid.parse(cleanedCode);
      if (currentRenderId !== renderIdRef.current) return;

      const tempId = `mermaid-${currentRenderId}`;
      const { svg } = await mermaid.render(tempId, cleanedCode);
      if (currentRenderId !== renderIdRef.current) return;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: scale(${previewConfig.scale});
        transform-origin: center center;
        transition: transform 0.2s ease;
      `;
      wrapper.innerHTML = svg;
      container.appendChild(wrapper);

      const svgElement = wrapper.querySelector('svg');
      if (svgElement) {
        svgElement.style.cssText = `
          max-width: 100%;
          max-height: 100%;
          height: auto;
          display: block;
        `;
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
    } catch (err) {
      if (currentRenderId !== renderIdRef.current) return;
      setError(parseError(err));
    } finally {
      if (currentRenderId === renderIdRef.current) setIsLoading(false);
    }
  });

  // 监听变化触发渲染
  useEffect(() => {
    if (isInitialized && currentDiagram.mermaidCode.trim()) {
      setError(null);
      const timer = setTimeout(() => renderDiagram(), 50);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, currentDiagram.mermaidCode, previewConfig.scale, previewConfig.theme, previewConfig.look, renderDiagram]);

  // 容器尺寸变化时重渲染
  useEffect(() => {
    if (!containerRef.current || !isInitialized) return;
    const observer = new ResizeObserver(() => {
      if (currentDiagram.mermaidCode.trim()) {
        setTimeout(() => renderDiagram(), 100);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isInitialized, currentDiagram.mermaidCode, renderDiagram]);

  // ─── Render ───────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, border: '2.5px solid var(--fm-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12, color: 'var(--fm-muted)' }}>渲染中...</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 24, height: 24, border: '2.5px solid var(--fm-warning)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
          <p style={{ fontSize: 12, color: 'var(--fm-muted)' }}>初始化渲染引擎...</p>
        </div>
      </div>
    );
  }

  if (!currentDiagram.mermaidCode.trim()) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--fm-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 13 }}>在左侧输入描述或 Mermaid 代码</p>
          <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>AI 将自动生成图表</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <AlertTriangle size={32} style={{ color: 'var(--fm-danger)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--fm-danger)', marginBottom: 8 }}>
            {error.type === 'syntax' ? '语法错误' : error.type === 'parse' ? '解析错误' : '渲染错误'}
          </h3>
          {error.line && (
            <p style={{ fontSize: 11, color: 'var(--fm-muted)', marginBottom: 12 }}>
              第 {error.line} 行{error.column ? `，第 ${error.column} 列` : ''}
            </p>
          )}
          <button
            onClick={handleAiFix}
            disabled={isAiFixing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 'var(--fm-radius)',
              border: '1px solid var(--fm-border)',
              background: 'var(--fm-surface)',
              color: 'var(--fm-accent)',
              fontSize: 12,
              cursor: isAiFixing ? 'not-allowed' : 'pointer',
              opacity: isAiFixing ? 0.6 : 1,
              transition: 'all 0.1s'
            }}
          >
            <Sparkles size={12} />
            {isAiFixing ? 'AI 修复中...' : 'AI Fix'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    />
  );
};

export default DiagramPreview;
