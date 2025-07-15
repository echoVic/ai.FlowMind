#!/usr/bin/env node

/**
 * 测试混合验证器功能
 */

async function testHybridValidator() {
  console.log('🧪 测试混合验证器...\n');

  const tests = [
    {
      name: '流程图（基于规则）',
      code: `flowchart TD
    A[开始] --> B[结束]`,
      expectParser: null
    },
    {
      name: '饼图（使用解析器）',
      code: `pie title 测试饼图
    "A" : 50
    "B" : 30`,
      expectParser: '@mermaid-js/parser'
    },
    {
      name: '序列图（基于规则）',
      code: `sequenceDiagram
    participant A
    participant B
    A->>B: 消息`,
      expectParser: null
    },
    {
      name: 'Git图（使用解析器）',
      code: `gitGraph
    commit
    branch feature
    commit
    checkout main
    commit`,
      expectParser: '@mermaid-js/parser'
    },
    {
      name: '错误的流程图',
      code: `flowchart TD
    A[开始] -> B[结束]`,
      expectValid: false
    },
    {
      name: '错误的饼图',
      code: `pie title 测试
    invalid syntax`,
      expectValid: false,
      expectParser: '@mermaid-js/parser'
    }
  ];

  for (const test of tests) {
    console.log(`📋 测试: ${test.name}`);
    
    try {
      const response = await fetch('http://localhost:3000/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'validate_mermaid',
            arguments: { mermaidCode: test.code }
          }
        })
      });
      
      // 这里我们通过 MCP 直接测试
      const input = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'validate_mermaid',
          arguments: { mermaidCode: test.code }
        }
      });
      
      console.log('📤 发送请求...');
      
      // 通过 spawn 调用 MCP 服务器
      const { spawn } = await import('child_process');
      const { fileURLToPath } = await import('url');
      const path = await import('path');
      
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const serverPath = path.join(__dirname, 'dist', 'index.js');
      
      const result = await new Promise((resolve, reject) => {
        const server = spawn('node', [serverPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        
        server.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        server.on('close', () => {
          resolve(output);
        });
        
        server.on('error', reject);
        
        server.stdin.write(input + '\n');
        server.stdin.end();
        
        setTimeout(() => {
          server.kill();
          resolve(output || 'timeout');
        }, 3000);
      });
      
      try {
        const response = JSON.parse(result);
        if (response.result && response.result.content) {
          const content = response.result.content[0].text;
          
          if (test.expectValid === false) {
            if (content.includes('❌')) {
              console.log('✅ 正确检测到错误');
            } else {
              console.log('❌ 应该检测到错误但没有');
            }
          } else {
            if (content.includes('✅')) {
              console.log('✅ 验证通过');
              
              if (test.expectParser) {
                if (content.includes(test.expectParser)) {
                  console.log(`✅ 使用了预期的解析器: ${test.expectParser}`);
                } else {
                  console.log(`❌ 没有使用预期的解析器: ${test.expectParser}`);
                }
              } else {
                if (!content.includes('@mermaid-js/parser')) {
                  console.log('✅ 使用了基于规则的验证');
                } else {
                  console.log('❌ 意外使用了解析器');
                }
              }
            } else {
              console.log('❌ 验证失败，但应该通过');
            }
          }
        } else {
          console.log('❌ 无效的响应格式');
        }
      } catch (e) {
        console.log('❌ 无法解析响应:', result.substring(0, 100));
      }
      
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    }
    
    console.log('');
  }
}

testHybridValidator().catch(console.error);