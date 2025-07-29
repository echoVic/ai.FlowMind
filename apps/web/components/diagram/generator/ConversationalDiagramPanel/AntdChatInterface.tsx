/**
 * 基于 Ant Design X 的聊天界面组件
 * 参考官方 demo 重构，简化架构和状态管理
 */
import { useInputPanel } from '@/lib/stores/hooks';
import {
  CheckCircleOutlined,
  ClearOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  PlusOutlined,
  RobotOutlined,
  SettingOutlined,
  UserOutlined
} from '@ant-design/icons';
import { Bubble, Prompts, Sender, ThoughtChain, ThoughtChainItem, useXAgent, useXChat, Welcome } from '@ant-design/x';
import { useMemoizedFn } from 'ahooks';
import { message as antdMessage, Button, Collapse, Select, Space, Tooltip, Typography } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type BubbleDataType = {
  role: string;
  content: string;
};

const { Text } = Typography;

interface DiagramMetadata {
  type: 'diagram';
  diagramCode: string;
  diagramType: string;
  suggestions?: string[];
  provider?: string;
}

interface ThoughtStep {
  title: string;
  description: string;
  status: 'pending' | 'success' | 'error';
  timestamp: string;
  icon?: React.ReactNode;
  content?: React.ReactNode;
}

const AntdChatInterface: React.FC = () => {
  const abortController = useRef<AbortController>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    selectedModel,
    currentDiagram,
    setCurrentDiagram,
    availableModels,
    setSelectedModel,
  } = useInputPanel();

  // 简化状态管理（参考官方 demo）
  const [inputValue, setInputValue] = useState('');
  const [thoughtSteps, setThoughtSteps] = useState<ThoughtStep[]>([]);
  const [showThoughtChain, setShowThoughtChain] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [thoughtChainExpanded, setThoughtChainExpanded] = useState<string[]>([]);

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

  // 获取状态图标（参考官方 demo）
  const getStatusIcon = useMemoizedFn((status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'pending':
        return <LoadingOutlined style={{ color: '#1677ff' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  });

  // 更新思考链步骤（参考官方 demo 优化）
  const updateThoughtStep = useMemoizedFn((
    title: string, 
    description: string, 
    status: 'pending' | 'success' | 'error',
    content?: React.ReactNode
  ) => {
    setThoughtSteps(prev => {
      const existingIndex = prev.findIndex(step => step.title === title);
      const newStep: ThoughtStep = {
        title,
        description,
        status,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        icon: getStatusIcon(status),
        content
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
    const requestId = Date.now().toString();
    setCurrentRequestId(requestId);
    // 新请求开始时自动展开思维链
    setThoughtChainExpanded([requestId]);
  });

  // 配置 Ant Design X Agent（修复流式响应和 loading 状态）
  const [agent] = useXAgent<BubbleDataType>({
    request: (info, callbacks) => {
      resetThoughtChain();
      updateThoughtStep(
        '分析需求', 
        '正在理解用户的图表需求...', 
        'pending',
        <div className="text-xs text-gray-600 bg-purple-50 p-2 rounded mt-1">
          解析用户输入，识别图表类型和关键要素...
        </div>
      );
      
      // 异步处理函数
      const processRequest = async () => {
        try {
          // 提取消息内容 - 处理新的对象格式
          console.log('=== useXAgent 接收到的 info ===', info);
          
          let userMessage = '';
          
          if (typeof info === 'string') {
            userMessage = info;
          } else if (info && typeof info === 'object') {
            // 处理 { stream: true, message: { role: 'user', content: '...' } } 格式
            if ((info as any).message?.content) {
              userMessage = (info as any).message.content;
            } else if ((info as any).content) {
              userMessage = (info as any).content;
            } else {
              userMessage = String(info);
            }
          } else {
            userMessage = String(info || '');
          }
          
          console.log('=== 提取的用户消息 ===', userMessage);
          
          if (!userMessage?.trim()) {
            throw new Error('消息内容为空，请输入您的需求');
          }

          const messagesToSend = [
            { role: 'user', content: userMessage.trim() }
          ];
        
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
          const chunks: any[] = [];

          // 流式读取响应
          let step = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            fullContent += chunk;
            
            // 根据内容更新思考步骤（增强版）
            if (fullContent.includes('```mermaid')) {
              updateThoughtStep(
                '生成图表', 
                '正在生成Mermaid图表代码...', 
                'pending',
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded mt-1">
                  检测到图表代码生成中，正在构建可视化结构...
                </div>
              );
            } else if (fullContent.includes('[METADATA]')) {
              updateThoughtStep(
                '处理结果', 
                '正在解析图表元数据...', 
                'pending',
                <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded mt-1">
                  解析图表类型、建议和相关信息...
                </div>
              );
            } else if (fullContent.length > 50 && step === 0) {
              updateThoughtStep(
                '构思设计', 
                '正在构思图表结构和布局...', 
                'pending',
                <div className="text-xs text-gray-600 bg-green-50 p-2 rounded mt-1">
                  分析需求并设计最适合的图表结构...
                </div>
              );
              step = 1;
            }

            // 实时更新流式内容 - 发送增量内容
            if (chunk.trim()) {
              const chunkData = {
                data: JSON.stringify({
                  choices: [{
                    delta: {
                      content: chunk
                    }
                  }]
                })
              };
              chunks.push(chunkData);
              callbacks.onUpdate(chunkData);
            }
          }

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
              
              updateThoughtStep(
                '完成生成', 
                '图表已成功生成并准备应用', 
                'success',
                <div className="text-xs text-gray-600 bg-green-50 p-2 rounded mt-1">
                  ✅ 图表代码已生成，元数据已解析，可以应用到编辑器
                </div>
              );
            } catch (e) {
              console.warn('元数据解析失败:', e);
              updateThoughtStep(
                '处理结果', 
                '图表元数据解析失败', 
                'error',
                <div className="text-xs text-gray-600 bg-red-50 p-2 rounded mt-1">
                  ❌ 无法解析图表元数据，但文本内容已生成
                </div>
              );
            }
          } else {
            updateThoughtStep(
              '完成生成', 
              '文本回复已生成', 
              'success',
              <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded mt-1">
                ✅ AI 回复已完成，内容已准备显示
              </div>
            );
          }

          // 调用成功回调 - 这是关键！
          callbacks.onSuccess(chunks);

        } catch (error) {
          console.error('Agent 请求失败:', error);
          antdMessage.error(`请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
          updateThoughtStep(
            '处理失败', 
            '请求处理过程中出现错误', 
            'error',
            <div className="text-xs text-gray-600 bg-red-50 p-2 rounded mt-1">
              ❌ {error instanceof Error ? error.message : '未知错误'}
            </div>
          );
          // 调用错误回调
          callbacks.onError(error as Error);
        }
      };

      // 执行异步处理
      processRequest();
    },
  });

  // 配置聊天功能
  const { onRequest, messages, setMessages } = useXChat({
    agent,
    requestFallback: (_, { error }) => {
      if (error.name === 'AbortError') {
        return {
          content: 'Request is aborted',
          role: 'assistant',
        };
      }
      return {
        content: 'Request failed, please try again!',
        role: 'assistant',
      };
    },
    transformMessage: (info) => {
      const { originMessage, chunk } = info || {};
      let currentContent = '';
      
      try {
        if (chunk?.data && !chunk?.data.includes('DONE')) {
          const message = JSON.parse(chunk?.data);
          currentContent = message?.choices?.[0]?.delta?.content || '';
        }
      } catch (error) {
        console.error('解析流式数据失败:', error);
      }

      const content = (originMessage?.content || '') + currentContent;
      
      return {
        content: content,
        role: 'assistant',
      };
    },
    resolveAbortController: (controller) => {
      abortController.current = controller;
    },
  });

  // 渲染嵌入式思维链（使用 Collapse）
  const renderEmbeddedThoughtChain = useMemoizedFn((isActive: boolean = false, requestId: string = '') => {
    if (thoughtSteps.length === 0) return null;
    
    const collapseKey = requestId || currentRequestId || 'default';
    
    const collapseItems = [
      {
        key: collapseKey,
        label: (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <RobotOutlined className="text-blue-500" />
              <Text strong className="text-sm">AI 思考过程</Text>
              <div className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                {thoughtSteps.length} 步骤
              </div>
              {isActive && (
                <div className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full animate-pulse">
                  进行中
                </div>
              )}
            </div>
            {!isActive && (
              <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded mr-4">
                已完成
              </div>
            )}
          </div>
        ),
        children: (
          <div className="pt-2">
            <ThoughtChain
              items={thoughtSteps.map((step, index) => ({
                key: `step-${index}`,
                title: step.title,
                description: step.description,
                status: step.status,
                icon: step.icon,
                extra: (
                  <div className="text-xs text-gray-400 bg-white/60 px-2 py-1 rounded">
                    {step.timestamp}
                  </div>
                ),
                content: step.content,
              } as ThoughtChainItem))}
              size="small"
            />
          </div>
        ),
      },
    ];

    
    
    return (
      <div className="my-4 mx-8">
        <Collapse
          items={collapseItems}
          activeKey={thoughtChainExpanded}
          onChange={(keys) => setThoughtChainExpanded(Array.isArray(keys) ? keys : [keys].filter(Boolean))}
          className={`transition-all duration-300 ${isActive ? 'shadow-lg' : 'opacity-90'}`}
          style={{
            background: 'linear-gradient(135deg, #f0f8ff 0%, #f5f0ff 100%)',
            border: isActive ? '1px solid #91caff' : '1px solid #d9d9d9',
          }}
          expandIconPosition="end"
          ghost={false}
        />
      </div>
    );
  });



  // 快速操作提示词（参考官方 demo）
  const QUICK_PROMPTS = useMemo(() => [
    {
      key: '1',
      description: '用户注册登录流程',
      icon: <UserOutlined />,
    },
    {
      key: '2', 
      description: '微服务架构设计',
      icon: <RobotOutlined />,
    },
    {
      key: '3',
      description: '订单处理流程', 
      icon: <SettingOutlined />,
    },
    {
      key: '4',
      description: '数据库ER图设计',
      icon: <PlusOutlined />,
    },
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
      setCurrentRequestId(null);
      setThoughtChainExpanded([]);
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


  // 检查是否接近底部
  const isNearBottom = useMemoizedFn(() => {
    if (!scrollContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100; // 距离底部100px内认为是接近底部
  });

  // 自动滚动到底部
  const scrollToBottom = useMemoizedFn((force: boolean = false) => {
    if (messagesEndRef.current && (force || isNearBottom())) {
      // 使用 setTimeout 确保 DOM 更新后再滚动
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }, 50);
    }
  });

  // 请求完成后自动收起思维链
  useEffect(() => {
    if (!agent.isRequesting() && currentRequestId && thoughtChainExpanded.includes(currentRequestId)) {
      // 延迟收起，让用户看到完成状态
      const timer = setTimeout(() => {
        setThoughtChainExpanded(prev => prev.filter(key => key !== currentRequestId));
      }, 3000); // 3秒后自动收起
      return () => clearTimeout(timer);
    }
  }, [agent, currentRequestId, thoughtChainExpanded]);

  // 监听消息变化，自动滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // 监听请求状态变化，在开始请求时滚动到底部
  useEffect(() => {
    if (agent.isRequesting()) {
      scrollToBottom();
    }
  }, [agent, scrollToBottom]);

  // 监听思维链步骤变化，自动滚动到底部
  useEffect(() => {
    if (thoughtSteps.length > 0 && agent.isRequesting()) {
      scrollToBottom();
    }
  }, [thoughtSteps, agent, scrollToBottom]);

  // 组件挂载时滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]); // 只在组件挂载时执行一次

  // 处理消息发送（带自动滚动）
  const handleSend = useMemoizedFn((content: string) => {
    if (!content.trim()) {
      console.warn('消息内容为空，忽略发送');
      return;
    }
    
    if (agent.isRequesting()) {
      antdMessage.error('请求正在进行中，请等待请求完成');
      return;
    }
    
    try {
      onRequest({
        stream: true,
        message: { role: 'user', content: content },
      });
      // 发送消息后强制滚动到底部
      setTimeout(() => scrollToBottom(true), 100);
    } catch (error) {
      console.error('发送消息失败:', error);
      antdMessage.error(`发送失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-white">
        <div className="flex items-center space-x-3">
          <RobotOutlined className="text-blue-500 text-lg" />
          <Text strong>AI 架构图助手</Text>
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        </div>

        <Space>
          <Select
            value={selectedModel}
            onChange={setSelectedModel}
            size="small"
            style={{ width: 160 }}
            placeholder="选择AI模型"
            disabled={agent.isRequesting()}
            options={availableModels.map(model => ({
              value: model.model,
              label: `${getProviderIcon(model.provider)} ${model.displayName}`,
            }))}
          />
          <Select
            value={currentDiagram.diagramType}
            onChange={(value) => {
              setCurrentDiagram({
                ...currentDiagram,
                diagramType: value as any
              });
            }}
            size="small"
            style={{ width: 140 }}
            options={diagramTypeOptions}
          />
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
        </Space>
      </div>

      {/* 聊天区域 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4">
          {messages?.length ? (
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isUser = message.message.role === 'user';
                const isLastUserMessage = isUser && index === messages.length - 1;
                const nextMessage = messages[index + 1];
                const isLastUserBeforeAssistant = isUser && nextMessage && nextMessage.message.role === 'assistant';
                
                // 显示思维链的条件：
                // 1. 是用户消息
                // 2. 是最后一条用户消息且正在请求中，或者
                // 3. 是用户消息且下一条是助手消息（已完成的对话）
                const showThoughtChainHere = isUser && (
                  (isLastUserMessage && agent.isRequesting()) || 
                  isLastUserBeforeAssistant
                );
                
                return (
                  <div key={message.id || index}>
                    {/* 渲染消息气泡 */}
                    <Bubble
                      placement={isUser ? 'end' : 'start'}
                      avatar={isUser ? <UserOutlined /> : <RobotOutlined />}
                      content={message.message.content}
                      typing={message.status === 'loading' ? { step: 5, interval: 20, suffix: <>💗</> } : false}
                      styles={{
                        content: isUser ? {
                          background: '#1677ff',
                          color: '#ffffff',
                        } : {
                          background: '#ffffff',
                          color: '#000000',
                        },
                      }}
                    />
                    
                    {/* 在用户消息后显示思维链 */}
                    {showThoughtChainHere && showThoughtChain && renderEmbeddedThoughtChain(
                      isLastUserMessage && agent.isRequesting(),
                      isLastUserMessage ? currentRequestId || '' : `completed-${index}`
                    )}
                  </div>
                );
              })}
              {/* 滚动标记 */}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Welcome
                variant="borderless"
                icon={<RobotOutlined style={{ fontSize: 48, color: '#1677ff' }} />}
                title="AI 架构图助手"
                description="描述您想要创建的架构图，我会为您生成专业的 Mermaid 图表"
              />
              <Prompts
                items={QUICK_PROMPTS}
                onItemClick={(info) => {
                  handleSend(info.data.description as string);
                }}
                style={{ marginTop: 24 }}
              />
            </div>
          )}
        </div>



        {/* 输入区域 */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <Sender
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => {
              handleSend(inputValue);
              setInputValue('');
            }}
            onCancel={() => {
              abortController.current?.abort();
            }}
            loading={agent.isRequesting()}
            placeholder="描述您想要生成的架构图，或询问如何优化现有图表..."
          />
        </div>
      </div>
    </div>
  );
};

export default AntdChatInterface;