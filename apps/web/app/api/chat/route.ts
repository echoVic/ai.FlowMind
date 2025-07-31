import { NextRequest } from 'next/server';
import { agentManager } from '../../../lib/services/AgentManager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Received request body:', JSON.stringify(body, null, 2));
    const { messages, model, diagramType, userId, sessionId } = body;
    
    // 验证必需字段
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 获取用户消息（简化架构：只处理当前消息）
    let userMessage = '';
    
    if (messages.length > 0) {
      const msg = messages[0]; // 只取第一条消息（当前用户消息）
      
      if (typeof msg === 'string') {
        userMessage = msg;
      } else if (msg && typeof msg === 'object' && msg.content) {
        userMessage = msg.content;
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
    
    // 生成会话ID（如果没有提供）
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 获取或创建 Agent 实例，启用内存功能和会话隔离
    let agent = agentManager.getAgent(model, currentSessionId);
    if (!agent) {
      // 如果会话级Agent不存在，先确保全局Agent存在
      if (!agentManager.getAgent(model)) {
        agentManager.registerAgent(model, {
          apiKey: apiKey,
          provider: 'volcengine' as const,
          modelName: model,
          enableMemory: true
        });
      }
      
      // 再次尝试获取会话级Agent（会自动创建）
      agent = agentManager.getAgent(model, currentSessionId);
      
      if (!agent) {
        return new Response(
          JSON.stringify({ error: `Failed to create session agent for model: ${model}` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // 简化架构：完全依赖Agent内部历史管理，不需要外部注入
    console.log('使用Agent内部历史管理，当前对话历史长度:', agent.getConversationHistory().length);
    
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
            // 使用 AgentManager 的流式生成方法（带会话ID）
            result = await agentManager.generateDiagramStream({
              description: userMessage,
              diagramType: diagramType || 'flowchart'
            }, (chunk: string) => {
              console.log('发送流式数据块:', chunk);
              // 实时发送流式数据
              const encoded = encoder.encode(chunk);
              controller.enqueue(encoded);
            }, model, currentSessionId);
            console.log('流式生成完成:', result);
            
            // 发送结束标记和元数据
            const metadata = {
              type: 'diagram',
              diagramCode: result.mermaidCode,
              diagramType: result.diagramType || diagramType || 'flowchart',
              sessionId: currentSessionId
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
      }, model, currentSessionId);
      
      // 构造响应 - 匹配客户端期望的格式
      const responseContent = result.explanation || '图表已生成';
      const metadata = {
        type: 'diagram',
        diagramCode: result.mermaidCode,
        diagramType: result.diagramType || diagramType || 'flowchart',
        sessionId: currentSessionId
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