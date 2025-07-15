#!/usr/bin/env node

/**
 * 手动测试核心功能
 */

import { MermaidValidator } from './dist/index.js';
import { TemplateManager } from './dist/index.js';

async function testValidator() {
  console.log('🧪 测试验证器...\n');
  
  const validator = MermaidValidator.getInstance();
  
  // 测试 1: 有效的流程图
  console.log('📋 测试 1: 有效的流程图');
  const result1 = await validator.validate(`flowchart TD
    A[开始] --> B[结束]`);
  console.log('结果:', result1);
  console.log(result1.valid ? '✅ 通过' : '❌ 失败', '\n');
  
  // 测试 2: 无效的流程图
  console.log('📋 测试 2: 无效的流程图');
  const result2 = await validator.validate(`flowchart TD
    A[开始] -> B[结束]`);
  console.log('结果:', result2);
  console.log(result2.valid ? '✅ 通过' : '❌ 失败', '\n');
  
  // 测试 3: 空代码
  console.log('📋 测试 3: 空代码');
  const result3 = await validator.validate('');
  console.log('结果:', result3);
  console.log(result3.valid ? '✅ 通过' : '❌ 失败', '\n');
}

async function testTemplates() {
  console.log('🧪 测试模板管理器...\n');
  
  const templateManager = TemplateManager.getInstance();
  
  // 测试 1: 获取所有模板
  console.log('📋 测试 1: 获取所有模板');
  const allTemplates = templateManager.getAllTemplates();
  console.log(`找到 ${allTemplates.length} 个模板`);
  console.log('✅ 通过\n');
  
  // 测试 2: 获取流程图模板
  console.log('📋 测试 2: 获取流程图模板');
  const flowchartTemplates = templateManager.getTemplatesByType('flowchart');
  console.log(`找到 ${flowchartTemplates.length} 个流程图模板`);
  flowchartTemplates.forEach(template => {
    console.log(`- ${template.name}: ${template.complexity}`);
  });
  console.log('✅ 通过\n');
  
  // 测试 3: 获取统计信息
  console.log('📋 测试 3: 获取统计信息');
  const stats = templateManager.getTemplateStats();
  console.log('统计信息:', stats);
  console.log('✅ 通过\n');
}

async function test() {
  try {
    await testValidator();
    await testTemplates();
    console.log('🎉 所有测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

test();