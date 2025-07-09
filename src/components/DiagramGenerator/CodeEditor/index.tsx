/**
 * 代码编辑器组件
 * 提供Mermaid代码编辑和语法高亮功能
 */
import React, { useRef, useEffect } from 'react';
import { useAtom } from 'jotai';
import { motion } from 'framer-motion';
import { Code, Copy, Download } from 'lucide-react';
import { currentDiagramAtom, editorConfigAtom } from '../../../stores/diagramStore';
import { useDiagramGenerator } from '../../../hooks/useDiagramGenerator';
import toast from 'react-hot-toast';

const CodeEditor: React.FC = () => {
  const [currentDiagram] = useAtom(currentDiagramAtom);
  const [editorConfig] = useAtom(editorConfigAtom);
  const { updateMermaidCode } = useDiagramGenerator();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateMermaidCode(e.target.value);
  };

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

  // 自动调整文本域高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [currentDiagram.mermaidCode]);

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* 标题栏 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Code className="text-green-400" size={20} />
          <h2 className="font-semibold text-white">Mermaid 代码编辑器</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopyCode}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
            title="复制代码"
          >
            <Copy size={16} />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadCode}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
            title="下载代码"
          >
            <Download size={16} />
          </motion.button>
        </div>
      </div>

      {/* 编辑器区域 */}
      <div className="flex-1 p-4">
        <textarea
          ref={textareaRef}
          value={currentDiagram.mermaidCode}
          onChange={handleCodeChange}
          className="w-full h-full min-h-[400px] p-4 bg-gray-800 text-green-400 font-mono text-sm border border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="在这里编辑 Mermaid 代码..."
          style={{ fontSize: editorConfig.fontSize }}
          spellCheck={false}
        />
      </div>

      {/* 状态栏 */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between items-center">
          <span>行数: {currentDiagram.mermaidCode.split('\n').length}</span>
          <span>字符数: {currentDiagram.mermaidCode.length}</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
