import { NextRequest } from 'next/server';
import { agentManager } from '../../../lib/services/AgentManager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    const { messages, model, diagramType, userId } = body;
    
    // 验证必需字段
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 获取用户最新消息和对话历史
    // 处理两种格式：直接字符串数组或包含role/content的对象数组
    let userMessage = '';
    const conversationHistory = [];
    
    if (messages.length > 0) {
      // 转换消息格式为统一的对话历史
      for (const msg of messages) {
        if (typeof msg === 'string') {
          // 如果是字符串格式，假设为用户消息
          if (msg === messages[messages.length - 1]) {
            userMessage = msg;
          } else {
            conversationHistory.push({ role: 'user', content: msg });
          }
        } else if (msg && typeof msg === 'object') {
          // 如果是对象格式，包含 role 和 content
          if (msg.role && msg.content) {
            conversationHistory.push({ role: msg.role, content: msg.content });
            if (msg === messages[messages.length - 1]) {
              userMessage = msg.content;
            }
          } else if (msg.content) {
            // 如果没有 role，根据位置推断
            if (msg === messages[messages.length - 1]) {
              userMessage = msg.content;
            } else {
              conversationHistory.push({ role: 'user', content: msg.content });
            }
          }
        }
      }
    }
    
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'No user message provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 检查 API 密钥配置
    const apiKey = process.env.NEXT_PUBLIC_ARK_API_KEY || 
                  process.env.NEXT_PUBLIC_OPENAI_API_KEY || 
                  process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || 
                  process.env.NEXT_PUBLIC_QWEN_API_KEY;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'API key not configured',
          message: 'Please configure your API key in environment variables' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 获取或创建 Agent 实例，启用内存功能
    let agent = agentManager.getAgent(model);
    if (!agent) {
      // 直接使用前端传来的model值作为modelName，前端已经处理了模型映射
      // 使用默认配置注册新Agent，启用内存功能
      agentManager.registerAgent(model, {
        apiKey: apiKey,
        provider: 'volcengine' as const,
        modelName: model, // 直接使用model参数值
        enableMemory: true
      });
      agent = agentManager.getAgent(model);
      
      // 如果仍然没有 Agent，返回错误
      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Failed to create agent for model: ${model}` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // 注入对话历史到 Agent
    if (conversationHistory.length > 0 && agent) {
      // 清空现有历史并注入新的对话历史
      agent.clearHistory();
      agent.setConversationHistory(conversationHistory);
    }
    
    // 检查是否支持流式输出
    const supportsStreaming = agent.supportsStreaming?.() || false;
    
    if (supportsStreaming) {
      // 创建流式响应
      const encoder = new TextEncoder();
      let result: any = null;
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log('开始流式生成图表...');
            // 使用 AgentManager 的流式生成方法
            result = await agentManager.generateDiagramStream({
              description: userMessage,
              diagramType: diagramType || 'flowchart'
            }, (chunk: string) => {
              console.log('发送流式数据块:', chunk);
              // 实时发送流式数据
              const encoded = encoder.encode(chunk);
              controller.enqueue(encoded);
            }, model);
            console.log('流式生成完成:', result);
            
            // 发送结束标记和元数据
            const metadata = {
              type: 'diagram',
              diagramCode: result.mermaidCode,
              diagramType: result.diagramType || diagramType || 'flowchart'
            };
            
            const endMarker = `\n[METADATA]${JSON.stringify(metadata)}[/METADATA]`;
            controller.enqueue(encoder.encode(endMarker));
            controller.close();
          } catch (error) {
            console.error('流式响应错误:', error);
            const errorMessage = `\n[ERROR]${error instanceof Error ? error.message : '生成失败'}[/ERROR]`;
            controller.enqueue(encoder.encode(errorMessage));
            controller.close();
          }
        }
      });
      
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Transfer-Encoding': 'chunked',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no', // 禁用Nginx缓冲
        }
      });
    } else {
      // 不支持流式，使用传统方式
      let streamingContent = '';
      const result = await agentManager.generateDiagramStream({
        description: userMessage,
        diagramType: diagramType || 'flowchart'
      }, (chunk: string) => {
        streamingContent += chunk;
        console.log('收到流式数据块:', chunk);
      }, model);
      
      // 构造响应 - 匹配客户端期望的格式
      const responseContent = result.explanation || '图表已生成';
      const metadata = {
        type: 'diagram',
        diagramCode: result.mermaidCode,
        diagramType: result.diagramType || diagramType || 'flowchart'
      };
      
      // 按照客户端期望的格式返回：内容 + 元数据标签
      const formattedResponse = `${responseContent}\n\n[METADATA]${JSON.stringify(metadata)}[/METADATA]`;
      
      console.log('DiagramAgent: 流式内容长度:', streamingContent.length);
      console.log('DiagramAgent: 最终响应长度:', formattedResponse.length);
      
      return new Response(
        formattedResponse,
        { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }
  } catch (error) {
    console.error('Chat API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}