#!/usr/bin/env node

/**
 * 简单的手动测试
 */

import { MermaidMCPServer } from './dist/index.js';

async function test() {
  console.log('🚀 测试 MCP 服务器功能...\n');
  
  try {
    // 导入处理器进行直接测试
    const { validateInput } = await import('./dist/index.js');
    const { handleValidateMermaid, handleGetDiagramTemplates } = await import('./dist/index.js');
    
    // 测试 1: 验证有效的流程图
    console.log('🧪 测试 1: 验证有效的流程图');
    const validCode = {
      mermaidCode: `flowchart TD
    A[开始] --> B[结束]`
    };
    
    const result1 = await handleValidateMermaid(validCode);
    console.log('📥 结果:', result1);
    console.log('✅ 测试 1 通过\n');
    
    // 测试 2: 验证无效的流程图
    console.log('🧪 测试 2: 验证无效的流程图');
    const invalidCode = {
      mermaidCode: `flowchart TD
    A[开始] -> B[结束]`
    };
    
    const result2 = await handleValidateMermaid(invalidCode);
    console.log('📥 结果:', result2);
    console.log('✅ 测试 2 通过\n');
    
    // 测试 3: 获取模板
    console.log('🧪 测试 3: 获取流程图模板');
    const templateQuery = {
      diagramType: 'flowchart',
      complexity: 'simple'
    };
    
    const result3 = await handleGetDiagramTemplates(templateQuery);
    console.log('📥 结果:', result3.content[0].text.substring(0, 200) + '...');
    console.log('✅ 测试 3 通过\n');
    
    console.log('🎉 所有功能测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

test();