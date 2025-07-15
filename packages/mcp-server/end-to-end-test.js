#!/usr/bin/env node

/**
 * 端到端测试
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function testMCPServer() {
  console.log('🚀 端到端测试 MCP 服务器...\n');
  
  const serverPath = path.join(__dirname, 'dist', 'index.js');
  
  const tests = [
    {
      name: '工具列表',
      input: '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}'
    },
    {
      name: '验证有效代码',
      input: '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "validate_mermaid", "arguments": {"mermaidCode": "flowchart TD\\n    A[开始] --> B[结束]"}}}'
    },
    {
      name: '验证无效代码',
      input: '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "validate_mermaid", "arguments": {"mermaidCode": "flowchart TD\\n    A[开始] -> B[结束]"}}}'
    },
    {
      name: '获取模板',
      input: '{"jsonrpc": "2.0", "id": 4, "method": "tools/call", "params": {"name": "get_diagram_templates", "arguments": {"diagramType": "flowchart", "complexity": "simple"}}}'
    }
  ];
  
  for (const test of tests) {
    console.log(`🧪 ${test.name}:`);
    
    const result = await new Promise((resolve, reject) => {
      const server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      
      server.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      server.on('close', (code) => {
        resolve(output);
      });
      
      server.on('error', (error) => {
        reject(error);
      });
      
      // 发送请求
      server.stdin.write(test.input + '\n');
      server.stdin.end();
      
      // 5秒后强制终止
      setTimeout(() => {
        server.kill();
        resolve(output || 'timeout');
      }, 5000);
    });
    
    try {
      const response = JSON.parse(result);
      console.log('✅ 成功:', response.result ? 'OK' : response.error);
    } catch (e) {
      console.log('📄 原始输出:', result.substring(0, 100) + '...');
    }
    
    console.log('');
  }
}

testMCPServer().catch(console.error);