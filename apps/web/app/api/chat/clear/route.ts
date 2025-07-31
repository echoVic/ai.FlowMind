import { NextRequest } from 'next/server';
import { agentManager } from '../../../../lib/services/AgentManager';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model } = body;
    
    // 清空指定模型的对话历史
    if (model) {
      agentManager.clearAgentHistory(model);
      console.log(`Cleared conversation history for model: ${model}`);
    } else {
      // 如果没有指定模型，清空所有对话历史
      agentManager.clearAllHistory();
      console.log('Cleared all conversation history');
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Conversation history cleared' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Clear chat API Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}