import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ValidateMermaidInputSchema, GetTemplatesInputSchema } from './types.js';

/**
 * MCP 工具定义
 */
export const mcpTools: Tool[] = [
  {
    name: 'validate_mermaid',
    description: `验证 Mermaid 图表语法的正确性。

这个工具可以：
- 检查 Mermaid 代码语法是否正确
- 提供具体的错误信息和行号
- 给出修复建议
- 支持所有 Mermaid 图表类型

使用场景：
- AI 生成 Mermaid 代码后进行验证
- 确保图表代码能够正确渲染
- 获取语法错误的详细信息`,
    inputSchema: {
      type: 'object',
      properties: {
        mermaidCode: {
          type: 'string',
          description: '要验证的 Mermaid 图表代码'
        },
        strict: {
          type: 'boolean',
          description: '是否启用严格模式验证（可选，默认 false）',
          default: false
        }
      },
      required: ['mermaidCode']
    }
  },
  {
    name: 'get_diagram_templates',
    description: `获取预定义的 Mermaid 图表模板。

这个工具提供：
- 多种图表类型的模板（流程图、序列图、类图等）
- 不同复杂度的示例（简单、中等、复杂）
- 针对不同用例的模板（软件架构、业务流程、数据库设计等）
- 完整的示例代码和说明

使用场景：
- 为 AI 提供图表生成的参考模板
- 帮助用户了解不同图表类型的语法
- 提供最佳实践示例`,
    inputSchema: {
      type: 'object',
      properties: {
        diagramType: {
          type: 'string',
          enum: [
            'flowchart',
            'sequence', 
            'class',
            'er',
            'gantt',
            'pie',
            'journey',
            'gitgraph',
            'mindmap',
            'timeline'
          ],
          description: '图表类型（可选）'
        },
        useCase: {
          type: 'string',
          enum: [
            'software-architecture',
            'business-process',
            'database-design',
            'project-management',
            'general'
          ],
          description: '使用场景（可选）'
        },
        complexity: {
          type: 'string',
          enum: ['simple', 'medium', 'complex'],
          description: '复杂度级别（可选）'
        }
      }
    }
  }
];

/**
 * 验证输入参数
 */
export function validateInput(toolName: string, args: unknown) {
  switch (toolName) {
    case 'validate_mermaid':
      return ValidateMermaidInputSchema.parse(args);
    case 'get_diagram_templates':
      return GetTemplatesInputSchema.parse(args);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}