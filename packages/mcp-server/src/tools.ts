import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { 
  ValidateMermaidInputSchema, GetTemplatesInputSchema, OptimizeDiagramInputSchema, ConvertFormatInputSchema,
  ValidateMermaidInput, GetTemplatesInput, OptimizeDiagramInput, ConvertFormatInput
} from './types.js';

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
  },
  {
    name: 'optimize_diagram',
    description: `优化 Mermaid 图表的布局和可读性。

这个工具提供：
- 自动优化图表布局和结构
- 提供可读性改进建议
- 分析图表复杂度并给出优化方案
- 支持多种优化目标（可读性、紧凑性、美观性、可访问性）

使用场景：
- 改进 AI 生成的图表质量
- 优化复杂图表的可读性
- 提供图表改进建议`,
    inputSchema: {
      type: 'object',
      properties: {
        mermaidCode: {
          type: 'string',
          description: '要优化的 Mermaid 图表代码'
        },
        goals: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['readability', 'compactness', 'aesthetics', 'accessibility']
          },
          description: '优化目标（可选，默认为 readability）',
          default: ['readability']
        },
        preserveSemantics: {
          type: 'boolean',
          description: '是否保持语义不变（可选，默认 true）',
          default: true
        },
        maxSuggestions: {
          type: 'number',
          description: '最大建议数量（可选，默认 5）',
          default: 5,
          minimum: 1,
          maximum: 10
        }
      },
      required: ['mermaidCode']
    }
  },
  {
    name: 'convert_diagram_format',
    description: `转换 Mermaid 图表格式或优化现有格式。

这个工具提供：
- 转换不同的 Mermaid 图表类型
- 优化图表语法结构
- 标准化图表格式
- 提供格式转换建议

使用场景：
- 将简单流程图转换为更合适的图表类型
- 优化图表语法结构
- 标准化图表格式`,
    inputSchema: {
      type: 'object',
      properties: {
        mermaidCode: {
          type: 'string',
          description: '要转换的 Mermaid 图表代码'
        },
        targetFormat: {
          type: 'string',
          enum: ['flowchart', 'sequence', 'class', 'er', 'gantt', 'pie', 'journey', 'gitgraph', 'auto'],
          description: '目标格式（可选，auto 为自动选择）',
          default: 'auto'
        },
        optimizeStructure: {
          type: 'boolean',
          description: '是否优化结构（可选，默认 true）',
          default: true
        }
      },
      required: ['mermaidCode']
    }
  }
];

/**
 * 验证输入参数
 */
export function validateInput(toolName: string, args: unknown): ValidateMermaidInput | GetTemplatesInput | OptimizeDiagramInput | ConvertFormatInput {
  switch (toolName) {
    case 'validate_mermaid':
      return ValidateMermaidInputSchema.parse(args);
    case 'get_diagram_templates':
      return GetTemplatesInputSchema.parse(args);
    case 'optimize_diagram':
      return OptimizeDiagramInputSchema.parse(args);
    case 'convert_diagram_format':
      return ConvertFormatInputSchema.parse(args); // 使用正确的格式转换输入验证
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}