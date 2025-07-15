#!/usr/bin/env node

/**
 * 简单的 MCP 服务器测试脚本
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 测试用例
const testCases = [
  {
    name: '工具列表',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    }
  },
  {
    name: '验证有效的流程图',
    request: {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'validate_mermaid',
        arguments: {
          mermaidCode: `flowchart TD
    A[开始] --> B[结束]`
        }
      }
    }
  },
  {
    name: '验证无效的流程图',
    request: {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'validate_mermaid',
        arguments: {
          mermaidCode: `flowchart TD
    A[开始] -> B[结束]`
        }
      }
    }
  },
  {
    name: '获取流程图模板',
    request: {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'get_diagram_templates',
        arguments: {
          diagramType: 'flowchart',
          complexity: 'simple'
        }
      }
    }
  }
];

async function runTest(testCase) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 测试: ${testCase.name}`);
    console.log(`📤 请求: ${JSON.stringify(testCase.request, null, 2)}`);

    const serverPath = path.join(__dirname, 'dist', 'index.js');
    const server = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let timeout;

    server.stdout.on('data', (data) => {
      output += data.toString();
      // 简单检查是否是完整的 JSON 响应
      if (output.includes('{"jsonrpc"')) {
        clearTimeout(timeout);
        server.kill();
        
        try {
          const response = JSON.parse(output.trim());
          console.log(`📥 响应: ${JSON.stringify(response, null, 2)}`);
          resolve(response);
        } catch (e) {
          console.log(`📥 原始响应: ${output}`);
          resolve({ raw: output });
        }
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`❌ 错误: ${data.toString()}`);
    });

    server.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`服务器退出，代码: ${code}`));
      }
    });

    // 发送请求
    server.stdin.write(JSON.stringify(testCase.request) + '\n');
    server.stdin.end();

    // 设置超时
    timeout = setTimeout(() => {
      server.kill();
      reject(new Error('测试超时'));
    }, 5000);
  });
}

async function runAllTests() {
  console.log('🚀 开始测试 MCP 服务器...\n');
  
  for (const testCase of testCases) {
    try {
      await runTest(testCase);
      console.log('✅ 测试通过');
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    }
  }
  
  console.log('\n🎉 所有测试完成');
}

runAllTests().catch(console.error);