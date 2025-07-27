import { DiagramAgent } from '../../../lib/agents/DiagramAgent';
import { agentManager } from '../../../lib/services/AgentManager';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, diagramType } = await req.json();
    
    // 获取用户最新消息
    const userMessage = messages[messages.length - 1]?.content;
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: 'No user message provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 获取或创建 Agent 实例
    let agent = agentManager.getAgent(model);
    if (!agent) {
      // 如果没有找到对应模型的 Agent，尝试注册一个新的
      // 使用默认配置注册新Agent
      agentManager.registerAgent(model, {
        apiKey: process.env.NEXT_PUBLIC_ARK_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_QWEN_API_KEY || '',
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
    
    // 构造响应
    const responseMessage = {
      id: Date.now().toString(),
      role: 'assistant' as const,
      content: result.explanation || '图表已生成',
      metadata: {
        type: 'diagram',
        diagramCode: result.mermaidCode,
        diagramType: result.diagramType || diagramType || 'flowchart'
      }
    };
    
    return new Response(
      JSON.stringify(responseMessage),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
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