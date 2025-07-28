/**
 * 基于 Ant Design X 的聊天界面组件
 * 实现"UI 只管界面、后端只管 Agent"的架构
 * 使用 useXAgent 和 useXChat 的标准组合
 */
import { useInputPanel } from '@/lib/stores/hooks';
import { ClearOutlined, RobotOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Bubble, Conversations, Sender, useXAgent, useXChat } from '@ant-design/x';
import { message as antdMessage, Button, Select, Space, Tooltip, Typography } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';

const { Text } = Typography;

interface DiagramMetadata {
  type: 'diagram';
  diagramCode: string;
  diagramType: string;
  suggestions?: string[];
  provider?: string;
}

interface ExtendedMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  createAt: number;
  metadata?: DiagramMetadata;
  success?: boolean;
  info?: string;
}

const AntdChatInterface: React.FC = () => {
  const {
    selectedModel,
    currentDiagram,
    setCurrentDiagram,
  } = useInputPanel();

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // 图表类型选项
  const diagramTypeOptions = [
    { value: 'flowchart', label: '🔄 流程图' },
    { value: 'sequence', label: '⏰ 时序图' },
    { value: 'class', label: '🏗️ 类图' },
    { value: 'state', label: '🚦 状态图' },
    { value: 'er', label: '🗄️ ER图' },
    { value: 'journey', label: '👤 旅程图' },
    { value: 'gantt', label: '📅 甘特图' },
    { value: 'pie', label: '🥧 饼图' },
    { value: 'quadrant', label: '🎯 四象限图' },
    { value: 'mindmap', label: '🧠 思维导图' },
    { value: 'gitgraph', label: '🌳 Git图' },
    { value: 'kanban', label: '📋 看板图' },
    { value: 'architecture', label: '🏛️ 架构图' },
    { value: 'packet', label: '📦 数据包图' },
  ];

  // 配置 Ant Design X Agent - 对接后端 LangChain
  const [agent] = useXAgent<string, { messages: any[] }, { content: string; metadata?: DiagramMetadata }>({
    request: async (info, callbacks) => {
      setIsGenerating(true);
      setStreamingContent('');
      
      // 生成临时消息ID用于流式显示
      const tempMessageId = `streaming-${Date.now()}`;
      setStreamingMessageId(tempMessageId);
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: info.messages,
            model: selectedModel,
            diagramType: currentDiagram.diagramType,
            userId: 'default'
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP 错误! 状态: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('无法获取响应流');
        }

        let fullContent = '';
        const decoder = new TextDecoder();
        let lastUpdateTime = Date.now();

        // 流式读取响应
        console.log('开始接收流式响应...');
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('流式响应结束');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('收到流式数据块:', chunk);
          fullContent += chunk;
          
          // 立即显示流式内容（移除节流）
          const displayContent = fullContent.replace(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/, '').trim();
          
          // 更新流式内容状态
          setStreamingContent(displayContent);
          
          // 通知 useXChat 更新流式内容
          if (displayContent && callbacks?.onUpdate) {
            callbacks.onUpdate({ content: displayContent });
          }
        }

        // 最终更新 - 确保所有内容都被显示
        const finalContent = fullContent.replace(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/, '').trim();
        
        // 解析图表元数据
        const metadataMatch = fullContent.match(/\[METADATA\]([\s\S]*?)\[\/METADATA\]/);
        let metadata: DiagramMetadata | undefined;
        let content = fullContent;

        if (metadataMatch) {
          try {
            metadata = JSON.parse(metadataMatch[1]);
            content = fullContent.replace(/\[METADATA\][\s\S]*?\[\/METADATA\]/, '').trim();
            
            // 自动更新图表状态
            if (metadata.type === 'diagram') {
              setCurrentDiagram({
                ...currentDiagram,
                mermaidCode: metadata.diagramCode,
                diagramType: metadata.diagramType as any,
              });
            }
          } catch (e) {
            console.warn('元数据解析失败:', e);
          }
        }

        return {
          content: content || finalContent || '响应内容为空',
          metadata
        };

      } catch (error) {
        console.error('Agent 请求失败:', error);
        antdMessage.error(`请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
        throw error;
      } finally {
        setIsGenerating(false);
        setStreamingContent('');
        setStreamingMessageId(null);
      }
    },
  });

  // 配置聊天功能
  const { onRequest, messages, setMessages } = useXChat({
    agent,
  });

  // 处理消息发送
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    try {
      await onRequest(content);
    } catch (error) {
      console.error('发送消息失败:', error);
      antdMessage.error('发送失败，请重试');
    }
  }, [onRequest]);

  // 渲染消息内容
  const renderMessageContent = useCallback((message: ExtendedMessage) => {
    // 添加空值检查
    if (!message.content) {
      return <div className="text-gray-400 italic">消息内容为空</div>;
    }
    
    const cleanContent = message.content.replace(/\[METADATA\][\s\S]*?\[\/METADATA\]/g, '').trim();
    const isDiagramMessage = message.content.includes('[METADATA]') && message.content.includes('"type":"diagram"');

    // 图表消息特殊渲染
    if (isDiagramMessage) {
      return (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center space-x-2 mb-2">
            <RobotOutlined className="text-blue-500" />
            <Text strong className="text-gray-800">生成了架构图</Text>
          </div>
          <div 
            className="text-gray-700 leading-relaxed mb-3"
            dangerouslySetInnerHTML={{ 
              __html: cleanContent
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
                .replace(/\n/g, '<br>')
            }}
          />
          <div className="flex items-center space-x-2">
            <Button 
              type="primary" 
              size="small"
              onClick={() => {
                antdMessage.success('已应用到编辑器');
              }}
            >
              应用到编辑器
            </Button>
            <Button 
              size="small"
              onClick={() => {
                antdMessage.info('查看代码功能开发中');
              }}
            >
              查看代码
            </Button>
          </div>
        </div>
      );
    }

    // 普通文本消息
    return (
      <div 
        className="text-gray-700 leading-relaxed whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ 
          __html: cleanContent
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
            .replace(/\n/g, '<br>')
        }}
      />
    );
  }, []);

  // 快速操作
  const quickActions = useMemo(() => [
    { key: 'example1', label: '用户注册登录流程', prompt: '用户注册登录流程' },
    { key: 'example2', label: '微服务架构设计', prompt: '微服务架构设计' },
    { key: 'example3', label: '订单处理流程', prompt: '订单处理流程' },
    { key: 'example4', label: '数据库ER图设计', prompt: '数据库ER图设计' }
  ], []);

  // 清空对话
  const handleClearChat = useCallback(() => {
    setMessages([]);
    antdMessage.success('对话已清空');
  }, [setMessages]);

  // 转换消息格式为 Ant Design X 格式
  const conversationItems = useMemo(() => {
    console.log('当前消息列表:', messages); // 调试日志
    return messages.filter(msg => msg && (msg as any).content).map((msg, index) => {
      const message = msg as any;
      console.log('渲染消息:', message); // 调试日志
      return (
        <Bubble
          key={message.id || `msg-${index}-${Date.now()}`}
          placement={message.role === 'user' ? 'end' : 'start'}
          content={renderMessageContent(message as ExtendedMessage)}
          avatar={message.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
          styles={{
            content: {
              background: message.role === 'user' ? '#1677ff' : '#ffffff',
              color: message.role === 'user' ? '#ffffff' : '#000000',
              maxWidth: '80%'
            }
          }}
        />
      );
    });
  }, [messages, renderMessageContent]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-white">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <RobotOutlined className="text-blue-500 text-lg" />
            <Text strong className="text-gray-900">AI 架构图助手</Text>
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
        </div>

        <Space>
          <Select
            value={currentDiagram.diagramType}
            onChange={(value) => {
              const newDiagram = {
                ...currentDiagram,
                diagramType: value as any
              };
              setCurrentDiagram(newDiagram);
            }}
            size="small"
            style={{ width: 140 }}
            options={diagramTypeOptions}
          />
          <Tooltip title="清空对话">
            <Button 
              type="text" 
              icon={<ClearOutlined />} 
              size="small"
              onClick={handleClearChat}
            />
          </Tooltip>
          <Tooltip title="设置">
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              size="small"
            />
          </Tooltip>
        </Space>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto">
          {conversationItems.length === 0 && !isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <RobotOutlined className="text-6xl text-gray-300 mb-4" />
              <Text strong className="text-gray-600 text-lg mb-2">AI 架构图助手</Text>
              <Text type="secondary" className="text-sm max-w-md">
                描述您想要创建的架构图，我会为您生成专业的 Mermaid 图表
              </Text>
              <div className="mt-6 grid grid-cols-2 gap-2">
                {quickActions.map(action => (
                  <Button 
                    key={action.key}
                    size="small" 
                    type="dashed"
                    onClick={() => handleSend(action.prompt)}
                    disabled={isGenerating}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <Conversations items={conversationItems} />
              
              {/* 流式内容显示 */}
              {isGenerating && streamingContent && (
                <div className="mt-4">
                  <Bubble
                    key={streamingMessageId}
                    placement="start"
                    content={
                      <div className="relative">
                        <div 
                          className="text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: streamingContent
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              .replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
                              .replace(/\n/g, '<br>')
                          }}
                        />
                        <div className="flex items-center mt-2 text-xs text-gray-400">
                          <div className="animate-pulse flex space-x-1">
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="ml-2">AI正在思考中...</span>
                        </div>
                      </div>
                    }
                    avatar={<RobotOutlined />}
                    styles={{
                      content: {
                        background: '#f8f9fa',
                        border: '1px dashed #d1d5db',
                        maxWidth: '80%'
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 快速操作按钮 */}
        {currentDiagram.mermaidCode && conversationItems.length > 0 && (
          <div className="px-4 pb-2 border-t border-gray-50">
            <div className="flex flex-wrap gap-2 py-2">
              <Text type="secondary" className="text-xs mr-2">快速操作:</Text>
              {quickActions.map(action => (
                <Button 
                  key={action.key}
                  size="small" 
                  type="dashed"
                  onClick={() => handleSend(action.prompt)}
                  disabled={isGenerating}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 输入区域 */}
        <div className="border-t border-gray-100 p-4 bg-white">
          <Sender
            placeholder="描述您想要生成的架构图，或询问如何优化现有图表..."
            onSubmit={handleSend}
            loading={isGenerating}
            disabled={isGenerating}
            style={{
              borderRadius: '8px',
            }}
          />
          <div className="flex justify-between items-center mt-2">
            <Text type="secondary" style={{ fontSize: '12px' }}>
             AI 驱动 • 支持流式响应
            </Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              模型: {selectedModel}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AntdChatInterface;