/**
 * 基于 Ant Design X 的聊天界面组件
 * 实现"UI 只管界面、后端只管 Agent"的架构
 * 使用 useXAgent 和 useXChat 的标准组合
 */
import { useInputPanel } from '@/lib/stores/hooks';
import { ClearOutlined, PlusOutlined, RobotOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Bubble, Sender, ThoughtChain, useXAgent, useXChat } from '@ant-design/x';
import { useMemoizedFn } from 'ahooks';
import { message as antdMessage, Button, Select, Space, Tooltip, Typography } from 'antd';
import React, { useMemo, useState } from 'react';

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

interface ThoughtStep {
    title: string;
    description: string;
    status: 'pending' | 'success' | 'error';
    timestamp: string;
  }

const AntdChatInterface: React.FC = () => {
  const {
    selectedModel,
    currentDiagram,
    setCurrentDiagram,
    availableModels,
    setSelectedModel,
    setShowAddCustomModel,
  } = useInputPanel();

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [thoughtSteps, setThoughtSteps] = useState<ThoughtStep[]>([]);
  const [showThoughtChain, setShowThoughtChain] = useState(false);

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
  const [agent] = useXAgent({
    request: async (info, callbacks) => {
      setIsGenerating(true);
      setStreamingContent('');
      resetThoughtChain();
      
      // 生成临时消息ID用于流式显示
      const tempMessageId = `streaming-${Date.now()}`;
      setStreamingMessageId(tempMessageId);
      
      try {
        updateThoughtStep('分析需求', '正在理解用户的图表需求...', 'pending');
        
        console.log('=== useXAgent 请求调试 ===');
        console.log('info:', info);
        console.log('info 类型:', typeof info);
        console.log('========================');
        
        // 简化消息处理 - 基于 Ant Design X 的实际行为
        let userMessage = '';
        let conversationHistory = [];
        
        // 处理不同的输入格式
        if (typeof info === 'string') {
          // 直接是用户输入的字符串
          userMessage = info;
        } else if (info && typeof info === 'object') {
          // 检查是否有 messages 数组（多轮对话）
          if ((info as any).messages && Array.isArray((info as any).messages)) {
            const validMessages = (info as any).messages.filter((msg: any) => msg && msg.content);
            if (validMessages.length > 0) {
              // 最后一条是当前消息，前面的是历史
              userMessage = validMessages[validMessages.length - 1].content;
              conversationHistory = validMessages.slice(0, -1).map((msg: any) => ({
                role: msg.role || 'user',
                content: msg.content
              }));
            }
          } else if ((info as any).content) {
            // 单个消息对象
            userMessage = (info as any).content;
          }
        }
        
        // 如果还是没有消息，尝试其他属性
        if (!userMessage && info && typeof info === 'object') {
          const possibleKeys = ['message', 'text', 'input', 'prompt', 'query'];
          for (const key of possibleKeys) {
            if ((info as any)[key] && typeof (info as any)[key] === 'string') {
              userMessage = (info as any)[key];
              break;
            }
          }
        }
        
        console.log('提取的用户消息:', userMessage);
        console.log('对话历史:', conversationHistory);
        
        if (!userMessage || !userMessage.trim()) {
          console.error('无法提取用户消息，原始 info:', info);
          // 提供一个默认消息作为最后的回退
          if (info) {
            const fallbackMessage = String(info).trim();
            if (fallbackMessage && fallbackMessage !== '[object Object]') {
              userMessage = fallbackMessage;
              console.log('使用回退消息:', userMessage);
            } else {
              throw new Error('无法获取有效的用户消息，请重新输入');
            }
          } else {
            throw new Error('消息内容为空，请输入您的需求');
          }
        }
        
        // 构建发送给后端的消息数组
        const messagesToSend = [
          ...conversationHistory,
          { role: 'user', content: userMessage.trim() }
        ];
        
        console.log('最终发送的消息数组:', messagesToSend);
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
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
        let step = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log('流式响应结束');
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('收到流式数据块:', chunk);
          fullContent += chunk;
          
          // 根据内容更新思考步骤
          if (fullContent.includes('```mermaid')) {
            updateThoughtStep('生成图表', '正在生成Mermaid图表代码...', 'pending');
          } else if (fullContent.includes('[METADATA]')) {
            updateThoughtStep('处理结果', '正在解析图表元数据...', 'pending');
          } else if (fullContent.length > 50 && step === 0) {
            updateThoughtStep('构思设计', '正在构思图表结构和布局...', 'pending');
            step = 1;
          }
          
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
            
            updateThoughtStep('完成生成', '图表已成功生成并准备应用', 'success');
          } catch (e) {
            console.warn('元数据解析失败:', e);
            updateThoughtStep('处理结果', '图表元数据解析失败', 'error');
          }
        } else {
          updateThoughtStep('完成生成', '文本回复已生成', 'success');
        }

        return {
          content: content || finalContent || '响应内容为空',
          metadata
        };

      } catch (error) {
        console.error('Agent 请求失败:', error);
        antdMessage.error(`请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
        updateThoughtStep('处理失败', '请求处理过程中出现错误', 'error');
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
  
  // 调试：监听消息变化
  React.useEffect(() => {
    console.log('消息状态更新:', messages);
  }, [messages]);

  // 处理消息发送
  const handleSend = useMemoizedFn(async (content: string) => {
    if (!content.trim()) {
      console.warn('消息内容为空，忽略发送');
      return;
    }
    
    console.log('准备发送消息:', content);
    
    try {
      await onRequest(content);
      console.log('消息发送成功');
    } catch (error) {
      console.error('发送消息失败:', error);
      antdMessage.error(`发送失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  // 渲染消息内容
  const renderMessageContent = useMemoizedFn((message: ExtendedMessage) => {
    // 添加空值检查
    if (!message.content) {
      return <div className="text-gray-400 italic">消息内容为空</div>;
    }
    
    const content = message.content;
    const isDiagramMessage = message.metadata?.type === 'diagram';

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
              __html: content
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
          __html: content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
            .replace(/\n/g, '<br>')
        }}
      />
    );
  });

  // 快速操作
  const quickActions = useMemo(() => [
    { key: 'example1', label: '用户注册登录流程', prompt: '用户注册登录流程' },
    { key: 'example2', label: '微服务架构设计', prompt: '微服务架构设计' },
    { key: 'example3', label: '订单处理流程', prompt: '订单处理流程' },
    { key: 'example4', label: '数据库ER图设计', prompt: '数据库ER图设计' }
  ], []);

  // 获取图标
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'volcengine':
        return '🌋';
      case 'openai':
        return '🤖';
      case 'claude':
        return '🧠';
      case 'azure':
        return '☁️';
      case 'gemini':
        return '💎';
      case 'qwen':
        return '🌟';
      default:
        return '⚙️';
    }
  };

  // 清空对话
  const handleClearChat = useMemoizedFn(async () => {
    try {
      // 清空前端消息
      setMessages([]);
      setThoughtSteps([]);
      setShowThoughtChain(false);
      
      // 通知后端清空对话历史
      await fetch('/api/chat/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel
        }),
      }).catch(err => {
        console.warn('清空后端对话历史失败:', err);
      });
      
      antdMessage.success('对话已清空');
    } catch (error) {
      console.error('清空对话失败:', error);
      antdMessage.error('清空对话失败');
    }
  });

  // 更新思考链步骤
  const updateThoughtStep = useMemoizedFn((title: string, description: string, status: 'pending' | 'success' | 'error') => {
    setThoughtSteps(prev => {
      const existingIndex = prev.findIndex(step => step.title === title);
      const newStep = {
        title,
        description,
        status,
        timestamp: new Date().toLocaleTimeString('zh-CN')
      };
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = newStep;
        return updated;
      } else {
        return [...prev, newStep];
      }
    });
  });

  // 重置思考链
  const resetThoughtChain = useMemoizedFn(() => {
    setThoughtSteps([]);
    setShowThoughtChain(true);
  });

  // 转换消息格式为 Ant Design X Conversations 组件格式
  const conversationItems = useMemo(() => {
    console.log('=== 转换消息格式调试 ===');
    console.log('原始 messages:', messages);
    console.log('messages 长度:', messages.length);
    
    const filteredMessages = messages.filter(msg => {
      if (!msg) return false;
      
      // 检查多种可能的内容属性
      const content = (msg as any).content || (msg as any).message;
      const hasContent = content !== undefined && content !== null && content !== '';
      
      console.log('🔍 消息过滤:', msg, '有内容:', hasContent);
      return hasContent;
    });
    
    console.log('过滤后的消息:', filteredMessages);
    
    // 转换为 Bubble.List 组件期望的格式
    const conversationData = filteredMessages.map((msg, index) => {
      const xchatMessage = msg as any;
      const messageContent = xchatMessage.content || xchatMessage.message;
      
      let role = 'user';
      let content = '';
      let metadata: DiagramMetadata | undefined;
      
      if (xchatMessage.role === 'user' || xchatMessage.status === 'local') {
        role = 'user';
        content = typeof messageContent === 'string' ? messageContent : String(messageContent || '');
      } else {
        role = 'assistant';
        if (typeof messageContent === 'string') {
          content = messageContent;
        } else if (typeof messageContent === 'object' && messageContent) {
          const contentObj = messageContent as { content: string; metadata?: DiagramMetadata };
          content = contentObj.content || String(messageContent);
          metadata = contentObj.metadata;
        } else {
          content = String(messageContent || '');
        }
      }
      
      // 为图表消息渲染特殊内容
      let displayContent: React.ReactNode = content;
      if (metadata?.type === 'diagram') {
        displayContent = renderMessageContent({
          id: xchatMessage.id || `msg-${index}`,
          role: role as 'user' | 'assistant',
          content,
          metadata,
          createAt: Date.now()
        });
      }
      
      return {
        key: xchatMessage.id || `msg-${index}`,
        role,
        content: displayContent,
        metadata,
      };
    });
    
    console.log('🎯 转换后的对话数据:', conversationData);
    return conversationData;
  }, [messages, renderMessageContent]);
  
  // 调试：监听 conversationItems 变化
  React.useEffect(() => {
    console.log('=== conversationItems 更新 ===');
    console.log('conversationItems 长度:', conversationItems.length);
    console.log('conversationItems:', conversationItems);
    console.log('conversationItems 类型:', typeof conversationItems);
    console.log('conversationItems 是数组:', Array.isArray(conversationItems));
    if (conversationItems.length > 0) {
      console.log('第一个 conversationItem:', conversationItems[0]);
      console.log('第一个 conversationItem 类型:', typeof conversationItems[0]);
    }
    console.log('==========================');
  }, [conversationItems]);

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
          {/* 模型选择 */}
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            size="small"
            style={{ width: 160 }}
            placeholder="选择AI模型"
            disabled={isGenerating}
            options={availableModels.map(model => ({
              value: model.model,
              label: `${getProviderIcon(model.provider)} ${model.displayName}`,
            }))}
          />
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
          <Tooltip title="添加自定义模型">
            <Button 
              type="text" 
              icon={<PlusOutlined />} 
              size="small"
              onClick={() => setShowAddCustomModel(true)}
            />
          </Tooltip>
          <Tooltip title="显示思考过程">
            <Button 
              type={showThoughtChain ? 'primary' : 'text'}
              icon={<RobotOutlined />} 
              size="small"
              onClick={() => setShowThoughtChain(!showThoughtChain)}
            />
          </Tooltip>
          <Tooltip title="清空对话">
            <Button 
              type="text" 
              icon={<ClearOutlined />} 
              size="small"
              onClick={handleClearChat}
            />
          </Tooltip>
          <Tooltip title="查看对话历史">
            <Button 
              type="text" 
              icon={<SettingOutlined />} 
              size="small"
              onClick={async () => {
                try {
                  const response = await fetch(`/api/chat/history?model=${selectedModel}`);
                  const data = await response.json();
                  console.log('对话历史:', data);
                  antdMessage.info(`当前对话历史: ${data.historyLength} 条消息`);
                } catch (error) {
                  console.error('获取对话历史失败:', error);
                  antdMessage.error('获取对话历史失败');
                }
              }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto">
          {(() => {
            console.log('🎨 渲染条件检查:');
            console.log('- conversationItems.length:', conversationItems.length);
            console.log('- isGenerating:', isGenerating);
            console.log('- 显示欢迎界面条件:', conversationItems.length === 0 && !isGenerating);
            console.log('- 应该显示对话:', !(conversationItems.length === 0 && !isGenerating));
            return null;
          })()}
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
              <Bubble.List
                autoScroll
                items={conversationItems}
                roles={{
                  user: {
                    placement: 'end',
                    avatar: <UserOutlined />,
                    styles: {
                      content: {
                        background: '#1677ff',
                        color: '#ffffff',
                      },
                    },
                  },
                  assistant: {
                    placement: 'start',
                    avatar: <RobotOutlined />,
                    styles: {
                      content: {
                        background: '#ffffff',
                        color: '#000000',
                      },
                    },
                  },
                }}
              />
              
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

        {/* 思考链 */}
         {showThoughtChain && thoughtSteps.length > 0 && (
           <div className="border-t border-gray-100 p-4 bg-gray-50">
             <ThoughtChain
               items={thoughtSteps.map(step => ({
                 title: step.title,
                 description: step.description,
                 status: step.status,
                 extra: step.timestamp
               }))}
               collapsible
             />
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