import { NextRequest } from 'next/server';
import { agentManager } from '../../../../lib/services/AgentManager';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const model = searchParams.get('model');
    const sessionId = searchParams.get('sessionId');
    
    // 获取指定模型的对话历史（支持会话隔离）
    const history = agentManager.getAgentHistory(model || undefined, sessionId || undefined);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        model: model || 'default',
        sessionId: sessionId || null,
        history: history,
        historyLength: history.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get history API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}