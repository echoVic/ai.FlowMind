/**
 * 会话隔离测试工具
 * 用于验证不同会话之间的对话历史是否正确隔离
 */

import { agentManager } from '../services/AgentManager';

export interface SessionTestResult {
  success: boolean;
  message: string;
  details?: {
    session1History: number;
    session2History: number;
    globalHistory: number;
  };
}

/**
 * 测试会话隔离功能
 */
export async function testSessionIsolation(): Promise<SessionTestResult> {
  try {
    console.log('=== 开始会话隔离测试 ===');
    
    const session1 = 'test_session_1';
    const session2 = 'test_session_2';
    const testModel = 'test-model';
    
    // 清空所有历史
    agentManager.clearAllHistory();
    
    // 注册测试Agent
    const arkApiKey = process.env.NEXT_PUBLIC_ARK_API_KEY;
    if (!arkApiKey) {
      return {
        success: false,
        message: '测试需要配置 ARK API Key'
      };
    }
    
    agentManager.registerAgent(testModel, {
      apiKey: arkApiKey,
      provider: 'volcengine',
      modelName: 'ep-20250617131345-rshkp',
      temperature: 0.7,
      maxTokens: 100,
      enableMemory: true
    });
    
    // 模拟会话1的对话
    console.log('模拟会话1的对话...');
    await agentManager.generateDiagram({
      description: '创建一个登录流程图',
      diagramType: 'flowchart'
    }, testModel, session1);
    
    // 模拟会话2的对话
    console.log('模拟会话2的对话...');
    await agentManager.generateDiagram({
      description: '创建一个注册流程图',
      diagramType: 'flowchart'
    }, testModel, session2);
    
    // 检查历史记录
    const session1History = agentManager.getAgentHistory(testModel, session1);
    const session2History = agentManager.getAgentHistory(testModel, session2);
    const globalHistory = agentManager.getAgentHistory(testModel);
    
    console.log('会话1历史长度:', session1History.length);
    console.log('会话2历史长度:', session2History.length);
    console.log('全局历史长度:', globalHistory.length);
    
    // 验证隔离效果
    const isIsolated = session1History.length > 0 && 
                      session2History.length > 0 && 
                      session1History.length !== session2History.length;
    
    // 清理测试Agent
    agentManager.removeAgent(testModel);
    agentManager.removeSession(session1);
    agentManager.removeSession(session2);
    
    if (isIsolated) {
      return {
        success: true,
        message: '会话隔离测试通过！不同会话的对话历史已正确隔离',
        details: {
          session1History: session1History.length,
          session2History: session2History.length,
          globalHistory: globalHistory.length
        }
      };
    } else {
      return {
        success: false,
        message: '会话隔离测试失败！不同会话的对话历史可能存在混淆',
        details: {
          session1History: session1History.length,
          session2History: session2History.length,
          globalHistory: globalHistory.length
        }
      };
    }
    
  } catch (error) {
    console.error('会话隔离测试异常:', error);
    return {
      success: false,
      message: `测试异常: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}

/**
 * 简单的会话隔离演示
 */
export function demonstrateSessionIsolation() {
  console.log('=== 会话隔离演示 ===');
  console.log('');
  console.log('问题描述:');
  console.log('- 用户A访问网站，使用qwen-max模型询问："画一个登录流程"');
  console.log('- 用户B访问网站，使用qwen-max模型询问："画一个注册流程"');
  console.log('- 在修复前：用户B会看到用户A的登录流程对话历史');
  console.log('- 在修复后：每个用户都有独立的会话ID和对话历史');
  console.log('');
  console.log('解决方案:');
  console.log('1. 为每个浏览器会话生成唯一的sessionId');
  console.log('2. AgentManager支持基于sessionId的Agent隔离');
  console.log('3. 每个sessionId对应独立的Agent实例和对话历史');
  console.log('4. 会话ID存储在localStorage中，24小时有效期');
  console.log('');
  console.log('技术实现:');
  console.log('- sessionAgents: Map<sessionId, Map<modelKey, agent>>');
  console.log('- 前端自动生成和管理sessionId');
  console.log('- API接口支持sessionId参数');
  console.log('- 向后兼容原有的全局Agent模式');
}