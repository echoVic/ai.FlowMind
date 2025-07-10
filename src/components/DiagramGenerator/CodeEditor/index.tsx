/**
 * 代码编辑器组件
 * 使用 CodeMirror 提供 Mermaid 代码编辑、语法高亮和实时校验功能
 */
import { lintGutter } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';
import { mermaid } from 'codemirror-lang-mermaid';
import { motion } from 'framer-motion';
import { AlertTriangle, Code, Copy, Download } from 'lucide-react';
import React, { useCallback } from 'react';
import toast from 'react-hot-toast';

import { useDiagramGenerator } from '../../../hooks/useDiagramGenerator';
import { useMermaidLinter } from '../../../hooks/useMermaidLinter';
import { useCurrentDiagram, useEditorConfig } from '../../../stores/hooks';

// 自定义 lint 样式
const lintTheme = EditorView.theme({
  '.cm-diagnostic': {
    padding: '3px 6px 3px 8px',
    marginLeft: '-1px',
    display: 'block',
    whiteSpace: 'pre-wrap'
  },
  '.cm-diagnostic-error': {
    borderLeft: '3px solid #d32f2f',
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    color: '#ff6b6b'
  },
  '.cm-diagnosticText': {
    fontSize: '12px',
    fontFamily: 'ui-monospace, monospace'
  },
  '.cm-lintRange-error': {
    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(211, 47, 47, 0.3) 3px, rgba(211, 47, 47, 0.3) 6px)',
    borderBottom: '2px solid #d32f2f'
  },
  '.cm-tooltip.cm-tooltip-lint': {
    backgroundColor: '#1e1e1e',
    border: '1px solid #d32f2f',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '12px',
    padding: '8px',
    maxWidth: '300px'
  }
});

const CodeEditor: React.FC = () => {
  const currentDiagram = useCurrentDiagram();
  const editorConfig = useEditorConfig();
  const { updateMermaidCode } = useDiagramGenerator();

  const mermaidLinter = useMermaidLinter();

  const handleCodeChange = useCallback((value: string) => {
    updateMermaidCode(value);
  }, [updateMermaidCode]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentDiagram.mermaidCode);
      toast.success('代码已复制到剪贴板！');
    } catch (error) {
      toast.error('复制失败，请手动复制');
    }
  };

  const handleDownloadCode = () => {
    const blob = new Blob([currentDiagram.mermaidCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDiagram.title || 'diagram'}.mmd`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('代码文件已下载！');
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Code className="text-green-400" size={20} />
          <h2 className="font-semibold">Mermaid 代码编辑器</h2>
  
        </div>
        
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyCode}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
            title="复制代码"
          >
            <Copy size={16} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadCode}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600"
            title="下载代码"
          >
            <Download size={16} />
          </motion.button>
        </div>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 overflow-hidden">
        <CodeMirror
          value={currentDiagram.mermaidCode}
          onChange={handleCodeChange}
          height="100%"
          theme={vscodeDark}
          extensions={[
            mermaid(),
            lintGutter(),
            mermaidLinter,
            lintTheme,
            EditorView.theme({
              '&': {
                height: '100%',
                maxHeight: '100%'
              },
              '.cm-editor': {
                height: '100%',
                maxHeight: '100%'
              },
              '.cm-scroller': {
                height: '100%',
                maxHeight: '100%',
                overflowY: 'auto',
                overflowX: 'auto'
              },
              '.cm-content': {
                padding: '10px'
              },
              '.cm-focused': {
                outline: 'none'
              }
            })
          ]}
          style={{ 
            fontSize: editorConfig.fontSize,
            height: '100%',
            maxHeight: '100%'
          }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
            foldGutter: true,
            autocompletion: true,
            syntaxHighlighting: true,
          }}
        />
      </div>

      {/* 状态栏 */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span>行数: {currentDiagram.mermaidCode.split('\n').length}</span>
            <span>字符数: {currentDiagram.mermaidCode.length}</span>
          </div>
          
          {/* 提示信息 */}
          <div className="flex items-center space-x-1 text-gray-500">
            <AlertTriangle size={12} />
            <span>语法错误会以红色下划线显示，鼠标悬停查看详情</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
