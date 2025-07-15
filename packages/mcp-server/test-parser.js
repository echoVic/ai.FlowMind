#!/usr/bin/env node

import { parse, MermaidParseError } from '@mermaid-js/parser';

async function testParser() {
  console.log('🧪 测试 @mermaid-js/parser...\n');
  
  try {
    // 测试 pie 图
    console.log('📊 测试 pie 图:');
    const pieResult = await parse('pie', `
      pie title Pet Adoption
      "Dogs" : 386
      "Cats" : 85
    `);
    console.log('✅ 解析成功:', pieResult);
    
    // 测试错误处理
    console.log('\n❌ 测试错误处理:');
    try {
      const errorResult = await parse('pie', 'invalid syntax');
      console.log('意外成功:', errorResult);
    } catch (error) {
      if (error instanceof MermaidParseError) {
        console.log('✅ 捕获到 MermaidParseError:', error.message);
        console.log('错误详情:', error.result.lexerErrors);
        console.log('解析错误:', error.result.parserErrors);
      } else {
        console.log('✅ 其他错误:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testParser();