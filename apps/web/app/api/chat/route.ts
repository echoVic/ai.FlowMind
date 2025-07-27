import { DiagramAgent } from '../../../lib/agents/DiagramAgent';
import { agentManager } from '../../../lib/services/AgentManager';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, diagramType } = body;
    
    // 验证必需字段
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 获取用户最新消息
    const userMessage = messages[messages.length - 1]?.content;
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
    
    // 获取或创建 Agent 实例
    let agent = agentManager.getAgent(model);
    if (!agent) {
      // 使用默认配置注册新Agent
      agentManager.registerAgent(model, {
        apiKey: apiKey,
        provider: 'volcengine' as const,
        modelName: model
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
    
    // 调用 Agent 生成图表
    const result = await agent.generateDiagram({
      description: userMessage,
      diagramType: diagramType || 'flowchart'
    });
    
    // 构造响应 - 匹配客户端期望的格式
    const responseContent = result.explanation || '图表已生成';
    const metadata = {
      type: 'diagram',
      diagramCode: result.mermaidCode,
      diagramType: result.diagramType || diagramType || 'flowchart'
    };
    
    // 按照客户端期望的格式返回：内容 + 元数据标签
    const formattedResponse = `${responseContent}\n\n[METADATA]${JSON.stringify(metadata)}[/METADATA]`;
    
    return new Response(
      formattedResponse,
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
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