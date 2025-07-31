/**
 * 多轮对话 AI 画图助手主组件
 * 基于 Ant Design X 重构，提供更好的聊天体验
 */
import React from 'react';
import AntdChatInterface from './AntdChatInterface';

interface ConversationalDiagramPanelProps {
  className?: string;
}

const ConversationalDiagramPanel: React.FC<ConversationalDiagramPanelProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      <AntdChatInterface />
    </div>
  );
};

export default ConversationalDiagramPanel;
