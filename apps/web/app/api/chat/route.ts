/**
 * 多轮对话 AI 聊天 API
 * 基于 LangChain Agent，实现"UI 只管界面、后端只管 Agent"架构
 * 完美对接 Ant Design X 的 useXAgent Hook
 */
import { NextRequest, NextResponse } from 'next/server';
import { agentManager } from '../../../services/AgentManager';
import type { DiagramGenerationRequest } from '../../../agents/DiagramAgent';

// Agent 实例池管理
const agentPool = new Map<string, any>();

/**
 * 获取或创建 Agent 实例
 */
function getOrCreateAgent(model: string, userId: string = 'default') {
  const agentKey = `${userId}-${model}`;
  
  if (!agentPool.has(agentKey)) {
    try {
      // 根据模型名称推断提供商类型
      let provider: 'volcengine' | 'openai' | 'anthropic' | 'qwen' = 'volcengine';
      let apiKey = '';
      
      if (model.startsWith('ep-') || model.includes('doubao') || model.includes('volcengine')) {
        provider = 'volcengine';
        apiKey = process.env.ARK_API_KEY || process.env.NEXT_PUBLIC_ARK_API_KEY || '';
      } else if (model.startsWith('gpt-') || model.includes('openai')) {
        provider = 'openai';
        apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';
      } else if (model.startsWith('claude-') || model.includes('anthropic')) {
        provider = 'anthropic';
        apiKey = process.env.ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '';
      } else if (model.includes('qwen') || model.includes('dashscope')) {
        provider = 'qwen';
        apiKey = process.env.QWEN_API_KEY || process.env.NEXT_PUBLIC_QWEN_API_KEY || '';
      }
      
      if (!apiKey) {
        throw new Error(`未找到 ${provider} 的 API 密钥`);
      }
      
      // 注册 Agent
      agentManager.registerAgent(agentKey, {
        apiKey,
        provider,
        modelName: model,
        temperature: 0.7,
        maxTokens: 2048,
        enableMemory: true
      });
      
      console.log(`Agent 创建成功: ${agentKey}`);
    } catch (error) {
      console.error(`Agent 创建失败: ${agentKey}`, error);
      throw error;
    }
  }
  
  return agentKey;
}

/**
 * 判断是否是图表相关请求
 */
function isDiagramRelated(content: string): boolean {
  const diagramKeywords = [
    '图', '流程', '架构', '设计', '模型', '关系', 'mermaid', 'diagram',
    '时序', '类图', 'ER图', '状态图', '甘特图', '思维导图', '流程图',
    '生成', '创建', '画', '绘制', '展示', '可视化'
  ];
  
  return diagramKeywords.some(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * 从聊天历史中提取现有图表代码
 */
function extractExistingDiagram(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.metadata?.type === 'diagram' && message.metadata?.diagramCode) {
      return message.metadata.diagramCode;
    }
  }
  return '';
}

/**
 * 创建图表流式响应
 */
function createDiagramStream(result: any) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // 发送 AI 解释
      if (result.explanation) {
        controller.enqueue(encoder.encode(result.explanation));
      }
      
      // 发送图表元数据
      const metadata = {
        type: 'diagram',
        diagramCode: result.mermaidCode,
        diagramType: result.diagramType,
        suggestions: result.suggestions || [],
        provider: result.metadata?.provider || 'AI'
      };
      
      controller.enqueue(encoder.encode(`\n\n[METADATA]${JSON.stringify(metadata)}[/METADATA]`));
      controller.close();
    }
  });
  
  return stream;
}

/**
 * 创建文本流式响应 - 兼容 Ant Design X
 */
function createTextStream(content: string) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // 模拟流式输出，提升用户体验
      const words = content.split('');
      let index = 0;
      
      const sendChunk = () => {
        if (index < words.length) {
          controller.enqueue(encoder.encode(words[index]));
          index++;
          setTimeout(sendChunk, 10); // 10ms 间隔
        } else {
          controller.close();
        }
      };
      
      sendChunk();
    }
  });
  
  return stream;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model, diagramType, userId = 'default' } = await req.json();
    
    console.log('=== 聊天 API 请求 ===');
    console.log('模型:', model);
    console.log('图表类型:', diagramType);
    console.log('消息数量:', messages?.length || 0);
    
    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
    }
    
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage?.content) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }
    
    // 获取或创建 Agent 实例
    let agentKey: string;
    try {
      agentKey = getOrCreateAgent(model, userId);
    } catch (error) {
      console.error('Agent 创建失败:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Agent 创建失败' 
      }, { status: 500 });
    }
    
    // 判断是否是图表相关请求
    const isDiagramRequest = isDiagramRelated(latestMessage.content);
    console.log('是否为图表请求:', isDiagramRequest);
    
    if (isDiagramRequest) {
      try {
        // 使用 LangChain Agent 处理图表请求
        const request: DiagramGenerationRequest = {
          description: latestMessage.content,
          diagramType: diagramType || 'flowchart',
          existingCode: extractExistingDiagram(messages)
        };
        
        console.log('发送给 Agent 的请求:', request);
        
        const result = await agentManager.generateDiagram(request, agentKey);
        console.log('Agent 生成成功');
        
        // 返回 nextjs-ai-chatbot 兼容的流式响应
        const responseContent = result.explanation || '图表生成完成';
        const metadata = {
          type: 'diagram',
          diagramCode: result.mermaidCode,
          diagramType: result.diagramType,
          suggestions: result.suggestions || [],
          provider: result.metadata?.provider || 'AI'
        };
        
        const fullResponse = `${responseContent}\n\n[METADATA]${JSON.stringify(metadata)}[/METADATA]`;
        
        return new Response(createTextStream(fullResponse), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
          },
        });
        
      } catch (error) {
        console.error('图表生成失败:', error);
        const errorMessage = error instanceof Error ? error.message : '图表生成失败';
        return new Response(createTextStream(`抱歉，图表生成失败：${errorMessage}`), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }
    } else {
      try {
        // 普通对话处理 - 创建一个简单的对话响应
        let response = '';
        
        if (latestMessage.content.includes('你好') || latestMessage.content.includes('hello')) {
          response = '你好！我是 AI 架构图助手。我可以帮您：\n\n• 生成各种类型的架构图\n• 优化现有的图表设计\n• 解答架构设计相关问题\n\n请告诉我您想要创建什么样的图表，或者有什么问题需要帮助？';
        } else if (latestMessage.content.includes('帮助') || latestMessage.content.includes('help')) {
          response = '我可以为您提供以下帮助：\n\n📊 **图表生成**\n• 流程图、时序图、类图等14种图表类型\n• 基于自然语言描述自动生成\n\n🔧 **图表优化**\n• 改善布局和视觉效果\n• 添加细节和说明\n• 简化复杂流程\n\n💡 **架构建议**\n• 系统设计最佳实践\n• 技术选型建议\n• 性能优化方案\n\n请直接描述您的需求，我会为您生成专业的架构图！';
        } else {
          response = `我理解您提到了"${latestMessage.content}"。作为架构图助手，我建议您：\n\n1. 如果想生成图表，请详细描述您的需求\n2. 如果想优化现有图表，请告诉我具体要求\n3. 如果有架构设计问题，我很乐意为您解答\n\n您希望我为您做什么呢？`;
        }
        
        console.log('普通对话处理成功');
        
        return new Response(createTextStream(response), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
        
      } catch (error) {
        console.error('对话处理失败:', error);
        const errorMessage = error instanceof Error ? error.message : '对话处理失败';
        return new Response(createTextStream(`抱歉，我遇到了一些问题：${errorMessage}`), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      }
    }
    
  } catch (error) {
    console.error('聊天 API 异常:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '服务器内部错误' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: '多轮对话 AI 聊天 API',
    version: '1.0.0',
    features: [
      '多轮对话',
      '图表生成',
      '智能识别',
      '流式响应'
    ]
  });
}
