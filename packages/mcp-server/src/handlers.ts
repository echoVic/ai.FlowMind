import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MermaidValidator } from './validator.js';
import { TemplateManager } from './templates.js';
import { DiagramOptimizer } from './optimizer/index.js';
import { ValidateMermaidInput, GetTemplatesInput, OptimizeDiagramInput } from './types.js';

/**
 * 处理 validate_mermaid 工具调用
 */
export async function handleValidateMermaid(input: ValidateMermaidInput): Promise<CallToolResult> {
  try {
    const validator = MermaidValidator.getInstance();
    const result = await validator.validate(input.mermaidCode, input.strict);

    if (result.valid) {
      const parserInfo = result.metadata?.parser ? `
使用解析器: ${result.metadata.parser}
图表类型: ${result.metadata.diagramType}` : '';
      
      return {
        content: [{
          type: 'text',
          text: `✅ **Mermaid 语法验证通过**

代码长度: ${input.mermaidCode.length} 字符
验证模式: ${input.strict ? '严格' : '标准'}${parserInfo}

您的 Mermaid 代码语法正确，可以正常渲染。`
        }]
      };
    } else {
      const errorInfo = [
        `❌ **Mermaid 语法验证失败**`,
        ``,
        `**错误信息:** ${result.error}`
      ];

      if (result.line) {
        errorInfo.push(`**错误位置:** 第 ${result.line} 行${result.column ? `，第 ${result.column} 列` : ''}`);
      }

      if (result.suggestions && result.suggestions.length > 0) {
        errorInfo.push('', '**修复建议:**');
        result.suggestions.forEach((suggestion, index) => {
          errorInfo.push(`${index + 1}. ${suggestion}`);
        });
      }

      errorInfo.push('', '**原始代码:**');
      errorInfo.push('```mermaid');
      errorInfo.push(input.mermaidCode);
      errorInfo.push('```');

      return {
        content: [{
          type: 'text',
          text: errorInfo.join('\n')
        }]
      };
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ **验证过程出错**

错误信息: ${error instanceof Error ? error.message : String(error)}

请检查输入的 Mermaid 代码是否完整。`
      }]
    };
  }
}

/**
 * 处理 get_diagram_templates 工具调用
 */
export async function handleGetDiagramTemplates(input: GetTemplatesInput): Promise<CallToolResult> {
  try {
    const templateManager = TemplateManager.getInstance();
    const templates = templateManager.getTemplates({
      diagramType: input.diagramType,
      useCase: input.useCase,
      complexity: input.complexity
    });

    if (templates.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `📋 **没有找到匹配的模板**

搜索条件:
- 图表类型: ${input.diagramType || '全部'}
- 使用场景: ${input.useCase || '全部'}
- 复杂度: ${input.complexity || '全部'}

建议调整搜索条件或查看所有可用模板。`
        }]
      };
    }

    const content = [
      `📋 **找到 ${templates.length} 个匹配的模板**`,
      ''
    ];

    if (input.diagramType || input.useCase || input.complexity) {
      content.push('**搜索条件:**');
      if (input.diagramType) content.push(`- 图表类型: ${input.diagramType}`);
      if (input.useCase) content.push(`- 使用场景: ${input.useCase}`);
      if (input.complexity) content.push(`- 复杂度: ${input.complexity}`);
      content.push('');
    }

    templates.forEach((template, index) => {
      content.push(`## ${index + 1}. ${template.name}`);
      content.push(`**描述:** ${template.description}`);
      content.push(`**类型:** ${template.type} | **场景:** ${template.useCase} | **复杂度:** ${template.complexity}`);
      
      if (template.tags.length > 0) {
        content.push(`**标签:** ${template.tags.join(', ')}`);
      }
      
      content.push('');
      content.push('**代码示例:**');
      content.push('```mermaid');
      content.push(template.code);
      content.push('```');
      content.push('');
    });

    // 添加统计信息
    const stats = templateManager.getTemplateStats();
    content.push('---');
    content.push(`**模板库统计:** 总共 ${stats.total} 个模板`);
    content.push(`**图表类型分布:** ${Object.entries(stats.byType).map(([type, count]) => `${type}(${count})`).join(', ')}`);

    return {
      content: [{
        type: 'text',
        text: content.join('\n')
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ **获取模板时出错**

错误信息: ${error instanceof Error ? error.message : String(error)}

请检查输入参数是否正确。`
      }]
    };
  }
}

/**
 * 处理 optimize_diagram 工具调用
 */
export async function handleOptimizeDiagram(input: OptimizeDiagramInput): Promise<CallToolResult> {
  try {
    const optimizer = new DiagramOptimizer();
    const result = optimizer.optimize(input);

    const content = [
      `🔧 **图表优化完成**`,
      '',
      '**优化统计:**',
      `- 原始代码行数: ${result.originalCode.split('\n').length}`,
      `- 优化后代码行数: ${result.optimizedCode.split('\n').length}`,
      `- 发现问题: ${result.suggestions.length} 个`,
      `- 应用优化: ${result.appliedOptimizations.length} 项`,
      '',
      '**质量指标:**',
      `- 📖 可读性: ${result.metrics.readabilityScore}/100`,
      `- 📦 紧凑性: ${result.metrics.compactnessScore}/100`,
      `- 🎨 美观性: ${result.metrics.aestheticsScore}/100`,
      `- ♿ 可访问性: ${result.metrics.accessibilityScore}/100`,
      ''
    ];

    if (result.suggestions.length > 0) {
      content.push('## 🔍 优化建议');
      content.push('');
      
      result.suggestions.forEach((suggestion, index) => {
        const impactEmoji = suggestion.impact === 'high' ? '🔴' : suggestion.impact === 'medium' ? '🟡' : '🟢';
        content.push(`### ${index + 1}. ${suggestion.title} ${impactEmoji}`);
        content.push(`**类型:** ${suggestion.type}`);
        content.push(`**影响:** ${suggestion.impact}`);
        content.push(`**描述:** ${suggestion.description}`);
        content.push(`**原因:** ${suggestion.reasoning}`);
        
        if (suggestion.beforeCode && suggestion.afterCode) {
          content.push('');
          content.push('**修改前:**');
          content.push('```mermaid');
          content.push(suggestion.beforeCode);
          content.push('```');
          
          content.push('**修改后:**');
          content.push('```mermaid');
          content.push(suggestion.afterCode);
          content.push('```');
        }
        
        content.push('');
      });
    }

    content.push('## 📋 优化后的代码');
    content.push('');
    content.push('```mermaid');
    content.push(result.optimizedCode);
    content.push('```');

    return {
      content: [{
        type: 'text',
        text: content.join('\n')
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ **图表优化失败**

错误信息: ${error instanceof Error ? error.message : String(error)}

请检查输入的 Mermaid 代码是否有效。`
      }]
    };
  }
}

/**
 * 处理 convert_diagram_format 工具调用
 */
export async function handleConvertDiagramFormat(input: any): Promise<CallToolResult> {
  try {
    const optimizer = new DiagramOptimizer();
    const result = optimizer.convertFormat(
      input.mermaidCode, 
      input.targetFormat || 'auto', 
      input.optimizeStructure !== false
    );

    const content = [
      `🔄 **图表格式转换完成**`,
      '',
      '**转换信息:**',
      `- 目标格式: ${input.targetFormat || 'auto (自动选择)'}`,
      `- 结构优化: ${input.optimizeStructure !== false ? '启用' : '禁用'}`,
      `- 原始代码行数: ${result.originalCode.split('\n').length}`,
      `- 转换后代码行数: ${result.optimizedCode.split('\n').length}`,
      '',
      '**质量指标:**',
      `- 📖 可读性: ${result.metrics.readabilityScore}/100`,
      `- 📦 紧凑性: ${result.metrics.compactnessScore}/100`,
      `- 🎨 美观性: ${result.metrics.aestheticsScore}/100`,
      `- ♿ 可访问性: ${result.metrics.accessibilityScore}/100`,
      ''
    ];

    if (result.suggestions.length > 0) {
      content.push('## 💡 转换说明');
      content.push('');
      
      result.suggestions.forEach((suggestion, index) => {
        content.push(`### ${index + 1}. ${suggestion.title}`);
        content.push(`**描述:** ${suggestion.description}`);
        content.push(`**原因:** ${suggestion.reasoning}`);
        content.push('');
      });
    }

    content.push('## 📋 转换后的代码');
    content.push('');
    content.push('```mermaid');
    content.push(result.optimizedCode);
    content.push('```');

    return {
      content: [{
        type: 'text',
        text: content.join('\n')
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ **格式转换失败**

错误信息: ${error instanceof Error ? error.message : String(error)}

请检查输入的 Mermaid 代码和目标格式是否有效。`
      }]
    };
  }
}