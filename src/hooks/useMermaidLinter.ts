import { Diagnostic, linter } from '@codemirror/lint';
import { useMount } from 'ahooks';
import mermaid from 'mermaid';
import { useMemo, useState } from 'react';

/**
 * 一个 React Hook，它创建并返回一个用于 CodeMirror 的 Mermaid 语法 Linter 扩展。
 * 这个 Hook 会管理 Mermaid 的初始化，并尝试从错误中解析行号以提供更精确的高亮。
 * 通过使用 useEffect 来处理初始化，它被设计得更加健壮，更符合 React 的习惯。
 */
export const useMermaidLinter = () => {
  const [mermaidInitialized, setMermaidInitialized] = useState(false);

  // 在使用此 Hook 的组件挂载时，初始化一次 Mermaid。
  // 这避免了潜在的竞争条件或重复初始化。
  useMount(() => {
    const initMermaid = async () => {
      try {
        await mermaid.initialize({ 
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          logLevel: 'error'
        });
        setMermaidInitialized(true);
        console.log('Mermaid initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Mermaid:', error);
        setMermaidInitialized(true); // 即使失败也设为 true，避免无限重试
      }
    };
    
    initMermaid();
  }); // 空依赖数组确保此 effect 只运行一次。

  const mermaidLinterExtension = useMemo(() => {
    return linter(view => {
      const diagnostics: Diagnostic[] = [];
      const code = view.state.doc.toString();

      // 编辑器为空时，不进行校验
      if (!code.trim()) {
        return diagnostics;
      }

      // 等待 Mermaid 初始化完成
      if (!mermaidInitialized) {
        return diagnostics;
      }

      // 先进行基本的语法检查
      const lines = code.split('\n');
      const graphDeclarations = lines.filter(line => 
        line.trim().match(/^(graph|flowchart|sequenceDiagram|classDiagram|gantt|pie|gitgraph|journey|erDiagram|quadrantChart|sankey|xychart)/i)
      );

      // 检查重复的图表声明
      if (graphDeclarations.length > 1) {
        // 找到第二个声明的位置
        let foundFirst = false;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.match(/^(graph|flowchart|sequenceDiagram|classDiagram|gantt|pie|gitgraph|journey|erDiagram|quadrantChart|sankey|xychart)/i)) {
            if (foundFirst) {
              // 这是重复的声明
              const lineStart = view.state.doc.line(i + 1).from;
              const lineEnd = view.state.doc.line(i + 1).to;
              
              diagnostics.push({
                from: lineStart,
                to: lineEnd,
                severity: 'error',
                message: `第 ${i + 1} 行：检测到重复的图表声明。一个 Mermaid 图表只能有一个图表类型声明。`,
                source: 'mermaid'
              });
            } else {
              foundFirst = true;
            }
          }
        }
      }

      try {
        // Linter 的核心：让 Mermaid 解析代码。
        // 如果代码无效，mermaid.parse() 会抛出一个错误。
        const result = mermaid.parse(code);
        console.log('Mermaid parse successful', result);
      } catch (error: any) {
        console.error('Mermaid 解析错误:', error);
        
        const errorMessage = error?.str || error?.message || '无效的 Mermaid 语法';
        let errorPosition = { from: 0, to: code.length };
        let displayMessage = errorMessage;

        // 尝试从错误信息中提取行号。
        // Mermaid 的错误信息通常是 "Parse error on line 7:..."
        const lineMatch = /Parse error on line (\d+)/.exec(errorMessage);
        
        if (lineMatch) {
          // 我们在错误信息中找到了行号。
          const lineNumber = parseInt(lineMatch[1], 10);
          
          // CodeMirror 的行号是从 1 开始的。
          if (lineNumber <= view.state.doc.lines && lineNumber > 0) {
            const line = view.state.doc.line(lineNumber);
            errorPosition = { from: line.from, to: line.to };
            
            // 创建更友好的错误消息
            if (errorMessage.includes('GRAPH')) {
              displayMessage = `第 ${lineNumber} 行：检测到重复的图表声明或语法错误。请确保只有一个 graph/flowchart 声明。`;
            } else if (errorMessage.includes('Expecting')) {
              displayMessage = `第 ${lineNumber} 行：语法错误，请检查节点、箭头和连接的格式。`;
            } else {
              displayMessage = `第 ${lineNumber} 行：${errorMessage}`;
            }
          }
        } else {
          // 尝试从错误信息中提取更多信息
          const positionMatch = /(\d+):(\d+)/.exec(errorMessage);
          if (positionMatch) {
            const line = parseInt(positionMatch[1], 10);
            const col = parseInt(positionMatch[2], 10);
            if (line <= view.state.doc.lines && line > 0) {
              const docLine = view.state.doc.line(line);
              const from = Math.min(docLine.from + col, docLine.to);
              errorPosition = { from, to: Math.min(from + 10, docLine.to) };
              displayMessage = `第 ${line} 行，第 ${col} 列：${errorMessage}`;
            }
          } else {
            // 如果无法定位具体位置，提供通用错误信息
            displayMessage = '语法错误：' + errorMessage;
          }
        }
        
        // 只有在没有重复声明错误时才添加解析错误
        if (diagnostics.length === 0) {
          diagnostics.push({
            from: errorPosition.from,
            to: errorPosition.to,
            severity: 'error',
            message: displayMessage,
            source: 'mermaid'
          });
        }

        console.log('Generated diagnostic:', {
          from: errorPosition.from,
          to: errorPosition.to,
          message: displayMessage
        });
      }
      
      console.log('Linter returning diagnostics:', diagnostics);
      return diagnostics;
    });
  }, [mermaidInitialized]); // 依赖 mermaidInitialized 状态

  return mermaidLinterExtension;
};
