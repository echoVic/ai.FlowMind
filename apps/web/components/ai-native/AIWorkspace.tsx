'use client';

/**
 * AI Workspace - 按设计稿一比一还原
 * 布局：toolbar (48px) | workspace (chat + preview + code) | statusbar (28px)
 */

import { useModelManager } from '@/lib/hooks/useModelManager';
import { useCurrentDiagram } from '@/lib/stores/hooks';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ConversationalDiagramPanel from '../chat';
import CodeEditor from '../diagram/CodeEditor';
import DiagramPreview from '../diagram/DiagramPreview';

const AIWorkspace: React.FC = () => {
  const currentDiagram = useCurrentDiagram();
  const { loadModels } = useModelManager();
  const [codePanelExpanded, setCodePanelExpanded] = useState(true);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // ─── Resize logic ─────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current || !workspaceRef.current) return;
      const rect = workspaceRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = (x / rect.width) * 100;
      const clamped = Math.max(25, Math.min(55, pct));
      workspaceRef.current.style.gridTemplateColumns = `${clamped}% 1px 1fr`;
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 检测图表类型
  const diagramType = (() => {
    const code = currentDiagram.mermaidCode.trim().toLowerCase();
    if (code.startsWith('graph') || code.startsWith('flowchart')) return 'FLOWCHART';
    if (code.startsWith('sequencediagram') || code.startsWith('sequence')) return 'SEQUENCE';
    if (code.startsWith('classdiagram') || code.startsWith('class')) return 'CLASS';
    if (code.startsWith('statediagram') || code.startsWith('state')) return 'STATE';
    if (code.startsWith('erdiagram') || code.startsWith('er')) return 'ER';
    if (code.startsWith('gantt')) return 'GANTT';
    if (code.startsWith('pie')) return 'PIE';
    if (code.startsWith('mindmap')) return 'MINDMAP';
    return 'MERMAID';
  })();

  return (
    <div className="fm-app">
      {/* ═══ TOOLBAR ═══ */}
      <header className="fm-toolbar">
        <div className="fm-toolbar-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3L2 9l10 6 10-6-10-6z"/>
            <path d="M2 15l10 6 10-6"/>
            <path d="M2 9v6"/>
            <path d="M22 9v6"/>
          </svg>
          <span>FlowMind</span>
        </div>

        <button className="fm-toolbar-sessions">
          当前会话
          <span className="count">1</span>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4"/></svg>
        </button>

        <span className="fm-toolbar-spacer" />

        <button className="fm-toolbar-model">
          <span className="dot" />
          Doubao-Seed-1.6
          <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4"/></svg>
        </button>

        <button className="fm-toolbar-btn" title="新建会话">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14"/></svg>
        </button>
        <button className="fm-toolbar-btn" title="历史记录">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        </button>
        <button className="fm-toolbar-btn" title="设置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        </button>

        <span className="fm-toolbar-kbd">⌘K</span>
      </header>

      {/* ═══ WORKSPACE ═══ */}
      <div className="fm-workspace" ref={workspaceRef}>
        {/* LEFT: Chat Panel */}
        <div className="fm-chat-panel">
          <ConversationalDiagramPanel />
        </div>

        {/* RESIZE HANDLE */}
        <div className="fm-resize-handle" onMouseDown={handleMouseDown} />

        {/* RIGHT: Preview + Code */}
        <div className="fm-right-panel">
          {/* Preview Area */}
          <div className="fm-preview-area">
            <div className="fm-preview-toolbar">
              <button title="放大">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
              </button>
              <button title="缩小">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35M8 11h6"/></svg>
              </button>
              <button title="适应窗口">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              </button>
              <button title="导出 SVG">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              </button>
            </div>

            <div className="fm-preview-canvas">
              <div className="mermaid-render">
                <DiagramPreview />
              </div>
            </div>

            <div className="fm-preview-badge">
              <span className="dot" />
              实时预览 · {diagramType}
            </div>
          </div>

          {/* Code Panel (collapsible) */}
          <div className={`fm-code-panel ${codePanelExpanded ? 'expanded' : 'collapsed'}`}>
            <div
              className="fm-code-panel-header"
              onClick={() => setCodePanelExpanded(!codePanelExpanded)}
            >
              <div className="left">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                <span>Mermaid 代码</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>diagram.mmd</span>
              </div>
              <div className="right">
                <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
              </div>
            </div>
            {codePanelExpanded && (
              <div style={{ height: 'calc(100% - 36px)', overflow: 'hidden' }}>
                <CodeEditor />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ STATUS BAR ═══ */}
      <footer className="fm-statusbar">
        <div className="status-item">
          <span className="status-dot" />
          <span>就绪</span>
        </div>
        <div className="status-item">
          <span className="status-pill">{diagramType}</span>
        </div>
        <span className="spacer" />
        <div className="status-item">UTF-8</div>
        <div className="status-item">Mermaid v11</div>
        <div className="status-item">
          <kbd style={{ fontFamily: 'var(--fm-font-mono)', fontSize: '10px', padding: '1px 4px', border: '1px solid var(--fm-border)', borderRadius: '3px' }}>⌘⇧P</kbd>
          <span style={{ marginLeft: '4px' }}>命令面板</span>
        </div>
      </footer>
    </div>
  );
};

export default AIWorkspace;
